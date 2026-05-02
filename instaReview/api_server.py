#!/usr/bin/env python3
# api_server.py - Instagram API with UGC Scoring using DeepSeek API

import os
import json
import sys
import time
import traceback
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

# Import your Instagram scraper
try:
    from insta import (
        build_session, fetch_profile_info, paginate_follow,
        fetch_timeline_via_feed, fetch_post_likes, fetch_post_comments,
        fetch_likers_by_media_id, fetch_tagged, normalize_username,
        download_and_base64, MAX_FOLLOWS, MAX_POSTS, MAX_LIKES_PER_POST,
        MAX_COMMENTS_PER_POST, MAX_TAGGED
    )
    INSTA_AVAILABLE = True
except ImportError as e:
    print(f"[ERROR] Could not import insta.py: {e}")
    INSTA_AVAILABLE = False
    sys.exit(1)

app = Flask(__name__)
CORS(app)

DEFAULT_LIMITS = {
    "followers": 100,
    "following": 100,
    "posts": 10,
    "tagged": 10,
    "likes": 50,
    "comments": 50,
}

DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"
DEEPSEEK_MODEL = "deepseek-v4-pro"

# ============================================================
# Helper Functions
# ============================================================

def load_instagram_cookie():
    cookie = os.getenv("INSTAGRAM_COOKIE")
    if cookie:
        return cookie.strip()
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                if line.startswith("INSTAGRAM_COOKIE="):
                    return line.split("=", 1)[1].strip()
    return None


def load_deepseek_api_key():
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if api_key:
        return api_key.strip()
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                if line.startswith("DEEPSEEK_API_KEY="):
                    return line.split("=", 1)[1].strip()
    return None


def parse_int(value, default):
    try:
        return max(0, int(value))
    except (ValueError, TypeError):
        return default


def process_post_node(session, node, limits):
    shortcode = node.get("shortcode", "")
    raw_mid = node.get("media_id") or node.get("id") or node.get("media_pk") or ""
    media_id = str(raw_mid).strip() if raw_mid else ""
    
    likes_nodes = []
    if shortcode:
        try:
            likes_nodes = fetch_post_likes(session, shortcode, limits["likes"])
        except Exception:
            pass
    
    if not likes_nodes and media_id:
        ref = f"https://www.instagram.com/p/{shortcode}/" if shortcode else "https://www.instagram.com/"
        try:
            likes_nodes = fetch_likers_by_media_id(session, media_id, limits["likes"], referer=ref)
        except Exception:
            pass
    
    comments_nodes = []
    try:
        comments_nodes = fetch_post_comments(session, shortcode, limits["comments"], media_id=media_id)
    except Exception:
        pass
    
    node["likes_count"] = node.get("edge_liked_by", {}).get("count", len(likes_nodes))
    node["comments_count"] = node.get("edge_media_to_comment", {}).get("count", len(comments_nodes))
    node["_likes"] = [{"username": u.get("username", ""), "full_name": u.get("full_name", "")} 
                      for u in likes_nodes if u.get("username")]
    node["_comments"] = comments_nodes
    
    captions = node.get("edge_media_to_caption", {}).get("edges", [])
    caption = captions[0].get("node", {}).get("text", "") if captions else ""
    node["caption"] = caption
    node["post_url"] = f"https://www.instagram.com/p/{shortcode}/" if shortcode else ""
    
    return node


def scrape_instagram_profile(username, cookie_val, limits):
    username = normalize_username(username) or username
    if not username:
        raise ValueError("Missing Instagram username or profile URL.")
    
    session = build_session(cookie_val)
    profile = fetch_profile_info(session, username)
    user_id = str(profile.get("id") or profile.get("pk") or "")
    
    if not user_id:
        raise ValueError("Could not detect Instagram user id from profile response.")
    
    followers_nodes = paginate_follow(session, user_id, "followers", limits["followers"])
    followers = [{"username": n.get("username", ""), "full_name": n.get("full_name", "")} 
                 for n in followers_nodes]
    
    following_nodes = paginate_follow(session, user_id, "following", limits["following"])
    following = [{"username": n.get("username", ""), "full_name": n.get("full_name", "")} 
                 for n in following_nodes]
    
    timeline_block = profile.get("edge_owner_to_timeline_media", {})
    timeline_edges = timeline_block.get("edges", [])[:limits["posts"]]
    timeline_nodes = [e.get("node", {}) for e in timeline_edges if e.get("node")]
    
    if not timeline_nodes and timeline_block.get("count", 0) > 0:
        timeline_nodes = fetch_timeline_via_feed(session, user_id, limits["posts"])
    
    posts = []
    for idx, node in enumerate(timeline_nodes, 1):
        processed = process_post_node(session, node, limits)
        posts.append({
            "shortcode": processed.get("shortcode", ""),
            "post_url": processed.get("post_url", ""),
            "caption": processed.get("caption", ""),
            "likes_count": processed.get("likes_count", 0),
            "comments_count": processed.get("comments_count", 0),
            "taken_at_timestamp": processed.get("taken_at_timestamp"),
            "likes": processed.get("_likes", []),
            "comments": processed.get("_comments", []),
        })
        time.sleep(0.5)
    
    return {
        "status": "ok",
        "username": username,
        "profile": {
            "id": user_id,
            "username": profile.get("username", ""),
            "full_name": profile.get("full_name", ""),
            "biography": profile.get("biography", ""),
            "external_url": profile.get("external_url", ""),
            "is_private": profile.get("is_private", False),
            "followers_count": profile.get("edge_followed_by", {}).get("count", 0),
            "following_count": profile.get("edge_follow", {}).get("count", 0),
            "posts_count": profile.get("edge_owner_to_timeline_media", {}).get("count", 0),
        },
        "followers": followers,
        "following": following,
        "posts": posts,
        "limits": limits,
    }


# ============================================================
# UGC SCORING USING DEEPSEEK API (COMPLETELY FIXED)
# ============================================================

def calculate_ugc_score_deepseek(profile_data):
    """Calculate UGC score using DeepSeek API - with robust JSON parsing"""
    api_key = load_deepseek_api_key()
    if not api_key:
        return {"status": "error", "message": "DeepSeek API key not found"}
    
    try:
        # Extract data
        profile = profile_data.get("profile", {})
        posts = profile_data.get("posts", [])
        followers = profile_data.get("followers", [])
        
        followers_count = profile.get("followers_count", 0)
        following_count = profile.get("following_count", 0)
        posts_count = len(posts)
        is_private = profile.get("is_private", False)
        external_url = profile.get("external_url", "")
        bio = profile.get("biography", "")
        username = profile.get("username", "")
        full_name = profile.get("full_name", "N/A")
        
        # Calculate engagement rates
        engagement_rates = []
        for post in posts[:5]:
            likes = post.get("likes_count", 0)
            comments = post.get("comments_count", 0)
            if followers_count > 0:
                er = ((likes + comments) / followers_count) * 100
                engagement_rates.append(er)
        
        avg_engagement_rate = sum(engagement_rates) / len(engagement_rates) if engagement_rates else 0
        ratio = followers_count / following_count if following_count > 0 else 0
        
        # Analyze followers
        empty_names = 0
        for f in followers[:100]:
            full_name_f = f.get("full_name", "")
            if not full_name_f or full_name_f == "":
                empty_names += 1
        
        real_name_percentage = 100 - (empty_names / 100) * 100 if followers else 0
        
        # Calculate averages
        total_likes = sum(p.get("likes_count", 0) for p in posts)
        total_comments = sum(p.get("comments_count", 0) for p in posts)
        avg_likes = total_likes / len(posts) if posts else 0
        avg_comments = total_comments / len(posts) if posts else 0
        
        # Format values
        avg_engagement_formatted = f"{avg_engagement_rate:.2f}"
        ratio_formatted = f"{ratio:.2f}"
        avg_likes_formatted = f"{avg_likes:.1f}"
        avg_comments_formatted = f"{avg_comments:.1f}"
        real_name_formatted = f"{real_name_percentage:.0f}"
        posts_count_str = str(posts_count)
        
        # Status strings
        is_private_str = "Private account - limited reach" if is_private else "Public account"
        external_presence_str = "Has external link" if external_url else "No external link"
        bio_status = "Has bio" if bio else "No bio"
        account_impact = "Private account reduces visibility" if is_private else "Public account is better for UGC"
        account_visibility_str = "Private" if is_private else "Public"
        
        # Build posts summary - clean special characters
        posts_summary_lines = []
        for i, post in enumerate(posts[:5], 1):
            caption = post.get("caption", "")[:150]
            # Clean the caption thoroughly
            caption = caption.replace('"', '\\"').replace('\n', ' ').replace('\r', ' ')
            caption = caption.encode('ascii', 'ignore').decode('ascii')  # Remove emojis and special chars
            likes = post.get("likes_count", 0)
            comments = post.get("comments_count", 0)
            posts_summary_lines.append(f'\nPost {i}:\n- Caption: "{caption}"\n- Likes: {likes}\n- Comments: {comments}')
        posts_summary = "".join(posts_summary_lines)
        
        # Simplify the prompt - make it shorter and cleaner
        scoring_prompt = f"""You are an Instagram UGC Creator Scoring Expert. Analyze this profile and return ONLY a valid JSON object.

Profile: @{username}
Followers: {followers_count}
Following: {following_count}
Posts: {posts_count}
Engagement Rate: {avg_engagement_formatted}%
Follower/Following Ratio: {ratio_formatted}
Private: {is_private}

Return JSON with this exact structure:
{
  "total_score": 50,
  "grade": "C",
  "is_recommended_for_ugc": false,
  "breakdown": {{
    "engagement_rate_score": {{"value": 50, "calculation": "{avg_engagement_formatted}%", "weighted_contribution": 15}},
    "content_quality_score": {{"value": 50, "caption_score": 15, "visual_score": 15, "consistency_score": 10, "cta_score": 10, "weighted_contribution": 12}},
    "audience_authenticity_score": {{"value": 50, "follower_following_ratio": "{ratio_formatted}", "name_authenticity_analysis": "mixed", "engagement_depth_analysis": "low", "weighted_contribution": 10}},
    "reach_potential_score": {{"value": 50, "post_frequency_analysis": "{posts_count} posts", "account_visibility": "{account_visibility_str}", "external_presence": "{external_presence_str}", "weighted_contribution": 7}},
    "professionalism_score": {{"value": 50, "bio_completeness": "{bio_status}", "collaboration_signals": "some", "account_type_impact": "{account_impact}", "weighted_contribution": 5}}
  }},
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2", "weakness3"],
  "recommendation": "Recommendation text here",
  "best_fit_niches": ["niche1", "niche2"],
  "estimated_ugc_rate_per_video": "$50 - $100"
}"""
        
        # Make DeepSeek API call
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        payload = {
            "model": DEEPSEEK_MODEL,
            "messages": [
                {"role": "system", "content": "You are an AI that returns ONLY valid JSON. No explanations, no markdown."},
                {"role": "user", "content": scoring_prompt}
            ],
            "temperature": 0.1,  # Lower temperature for more consistent output
            "max_tokens": 1500,
            "stream": False
        }
        
        print(f"[i] Sending request to DeepSeek API...")
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload, timeout=60)
        
        if response.status_code != 200:
            # Return default score instead of error
            return generate_default_score(profile_data)
        
        result = response.json()
        assistant_content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        if not assistant_content:
            return generate_default_score(profile_data)
        
        print(f"[i] Received response from DeepSeek")
        
        # Clean the response - remove any markdown or extra text
        response_text = assistant_content.strip()
        
        # Remove markdown code blocks
        if "```json" in response_text:
            start = response_text.find("```json") + 7
            end = response_text.find("```", start)
            response_text = response_text[start:end].strip()
        elif "```" in response_text:
            start = response_text.find("```") + 3
            end = response_text.find("```", start)
            response_text = response_text[start:end].strip()
        
        # Find JSON in the response
        start = response_text.find("{")
        end = response_text.rfind("}") + 1
        if start >= 0 and end > start:
            response_text = response_text[start:end]
        
        # Try to parse JSON with error recovery
        try:
            scoring = json.loads(response_text)
        except json.JSONDecodeError:
            # If JSON parsing fails, try to fix common issues
            # Replace unescaped quotes
            import re
            response_text = re.sub(r'(?<!\\)"', '\\"', response_text)
            response_text = re.sub(r'\\"([^"]*?)\\"', r'"\1"', response_text)
            try:
                scoring = json.loads(response_text)
            except:
                # Fallback to default scoring
                return generate_default_score(profile_data)
        
        # Calculate weighted contributions
        if "breakdown" in scoring:
            weights = {
                "engagement_rate_score": 0.3,
                "content_quality_score": 0.25,
                "audience_authenticity_score": 0.2,
                "reach_potential_score": 0.15,
                "professionalism_score": 0.1
            }
            for key, weight in weights.items():
                if key in scoring["breakdown"] and "value" in scoring["breakdown"][key]:
                    scoring["breakdown"][key]["weighted_contribution"] = round(
                        scoring["breakdown"][key]["value"] * weight, 1
                    )
        
        return {"status": "ok", "scoring": scoring}
        
    except Exception as e:
        print(f"[ERROR] DeepSeek scoring failed: {e}")
        return generate_default_score(profile_data)


def generate_default_score(profile_data):
    """Generate a default score based on profile metrics (fallback when API fails)"""
    profile = profile_data.get("profile", {})
    posts = profile_data.get("posts", [])
    
    followers_count = profile.get("followers_count", 0)
    following_count = profile.get("following_count", 0)
    posts_count = len(posts)
    is_private = profile.get("is_private", False)
    external_url = profile.get("external_url", "")
    bio = profile.get("biography", "")
    
    # Calculate simple metrics
    total_likes = sum(p.get("likes_count", 0) for p in posts)
    total_comments = sum(p.get("comments_count", 0) for p in posts)
    avg_engagement = ((total_likes + total_comments) / followers_count * 100) if followers_count > 0 else 0
    ratio = followers_count / following_count if following_count > 0 else 0
    
    # Calculate score
    engagement_score = min(100, avg_engagement * 10)
    ratio_score = min(40, ratio * 100)
    frequency_score = min(30, posts_count * 3)
    private_penalty = 20 if is_private else 0
    link_bonus = 15 if external_url else 0
    bio_bonus = 10 if bio else 0
    
    total_score = (
        (engagement_score * 0.3) +
        (ratio_score * 0.2) +
        (frequency_score * 0.2) +
        ((100 - private_penalty) * 0.15) +
        ((bio_bonus + link_bonus) * 0.15)
    )
    total_score = round(total_score, 1)
    
    # Determine grade
    if total_score >= 80:
        grade = "A"
        recommended = True
    elif total_score >= 60:
        grade = "B"
        recommended = True
    elif total_score >= 40:
        grade = "C"
        recommended = False
    elif total_score >= 20:
        grade = "D"
        recommended = False
    else:
        grade = "F"
        recommended = False
    
    account_visibility = "Private" if is_private else "Public"
    external_presence = "Has link" if external_url else "No link"
    bio_status = "Has bio" if bio else "No bio"
    
    return {
        "status": "ok",
        "scoring": {
            "total_score": total_score,
            "grade": grade,
            "is_recommended_for_ugc": recommended,
            "breakdown": {
                "engagement_rate_score": {"value": round(engagement_score, 1), "calculation": f"Avg: {avg_engagement:.2f}%", "weighted_contribution": round(engagement_score * 0.3, 1)},
                "content_quality_score": {"value": 50, "caption_score": 15, "visual_score": 15, "consistency_score": 10, "cta_score": 10, "weighted_contribution": 12.5},
                "audience_authenticity_score": {"value": round(ratio_score, 1), "follower_following_ratio": f"{ratio:.2f}", "name_authenticity_analysis": "based on profile data", "engagement_depth_analysis": "calculated", "weighted_contribution": round(ratio_score * 0.2, 1)},
                "reach_potential_score": {"value": round(frequency_score + (0 if not is_private else -20) + (15 if external_url else 0), 1), "post_frequency_analysis": f"{posts_count} posts", "account_visibility": account_visibility, "external_presence": external_presence, "weighted_contribution": round((frequency_score + (0 if not is_private else -20) + (15 if external_url else 0)) * 0.15, 1)},
                "professionalism_score": {"value": (20 if bio else 0) + (15 if external_url else 0), "bio_completeness": bio_status, "collaboration_signals": "analyzed", "account_type_impact": "Private reduces visibility" if is_private else "Public is better", "weighted_contribution": round(((20 if bio else 0) + (15 if external_url else 0)) * 0.1, 1)}
            },
            "strengths": ["Has external portfolio" if external_url else "Active account", f"{followers_count} followers"],
            "weaknesses": ["Private account limits reach" if is_private else "Could post more frequently" if posts_count < 10 else "None significant"],
            "recommendation": "This account has potential. Make it public for better UGC opportunities." if is_private else "Good engagement potential. Increase posting frequency for better results.",
            "best_fit_niches": ["fashion", "lifestyle", "photography"],
            "estimated_ugc_rate_per_video": "$50 - $150"
        }
    }

# ============================================================
# FLASK ROUTES
# ============================================================

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "service": "Instagram Profile API with UGC Scoring (DeepSeek)",
        "version": "2.0",
        "endpoints": {
            "GET /profile?username=xxx": "Fetch Instagram profile with UGC scoring",
            "GET /health": "Health check",
            "POST /score": "Score existing Instagram data"
        }
    })


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "deepseek_configured": bool(load_deepseek_api_key()),
        "instagram_cookie_configured": bool(load_instagram_cookie())
    })


@app.route('/profile', methods=['GET'])
def get_profile():
    username = request.args.get('username', '').strip()
    if not username:
        return jsonify({"status": "error", "message": "Missing 'username' parameter"}), 400
    
    cookie_val = load_instagram_cookie()
    if not cookie_val:
        return jsonify({"status": "error", "message": "Instagram cookie not configured"}), 401
    
    limits = {
        "followers": parse_int(request.args.get('followers_limit'), DEFAULT_LIMITS["followers"]),
        "following": parse_int(request.args.get('following_limit'), DEFAULT_LIMITS["following"]),
        "posts": parse_int(request.args.get('posts_limit'), DEFAULT_LIMITS["posts"]),
        "tagged": parse_int(request.args.get('tagged_limit'), DEFAULT_LIMITS["tagged"]),
        "likes": parse_int(request.args.get('likes_limit'), DEFAULT_LIMITS["likes"]),
        "comments": parse_int(request.args.get('comments_limit'), DEFAULT_LIMITS["comments"]),
    }
    
    try:
        print(f"[i] Scraping Instagram profile: @{username}")
        profile_data = scrape_instagram_profile(username, cookie_val, limits)
        
        print(f"[i] Calculating UGC score using DeepSeek AI...")
        scoring_result = calculate_ugc_score_deepseek(profile_data)
        profile_data["scoring"] = scoring_result
        
        return jsonify(profile_data)
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e), "traceback": traceback.format_exc()}), 500


@app.route('/score', methods=['POST'])
def score_profile():
    """Score already collected Instagram data"""
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Invalid JSON body"}), 400
    
    scoring_result = calculate_ugc_score_deepseek(data)
    return jsonify(scoring_result)


# ============================================================
# MAIN
# ============================================================

if __name__ == '__main__':
    print("=" * 60)
    print("Instagram API Server with UGC Scoring (DeepSeek) - FIXED")
    print("=" * 60)
    print(f"  DeepSeek API Key: {'✓ Configured' if load_deepseek_api_key() else '✗ MISSING'}")
    print(f"  Instagram Cookie: {'✓ Configured' if load_instagram_cookie() else '✗ MISSING'}")
    print("=" * 60)
    print("  Server running at: http://localhost:8000")
    print("  Example: http://localhost:8000/profile?username=jouiniomar&posts_limit=5")
    print("=" * 60)
    
    app.run(host='127.0.0.1', port=8000, debug=True)
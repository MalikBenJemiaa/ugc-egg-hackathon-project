#!/usr/bin/env python3
# insta.py
# Requires: requests, python-dotenv
# pip install requests python-dotenv

import os
import re
import sys
import json
import time
import base64
import random
import html
import urllib.parse
from typing import Dict, Any, List, Optional, Tuple

import requests
from dotenv import load_dotenv

# ---------------- CONFIG ----------------
MAX_FOLLOWS          = 400
PAGE_SIZE_FOLLOWS    = 50
MAX_POSTS            = 1000000
MAX_TAGGED           = 1000000
MAX_LIKES_PER_POST   = 1000000
PAGE_SIZE_LIKES      = 50
MAX_COMMENTS_PER_POST = 1000000
PAGE_SIZE_COMMENTS   = 50

SLEEP_MIN = 0.7
SLEEP_MAX = 1.5

X_IG_APP_ID = "936619743392459"
DEFAULT_UA_WEB = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

HASH_FOLLOWERS = "c76146de99bb02f6415203be841dd25a"
HASH_FOLLOWING = "d04b0a864b4b54837c0d870b0e77e076"
HASH_LIKES     = "d5d763b1e2acf209d62d22d184488e57"
HASH_COMMENTS  = "97b41c52301f77ce508f55e66d17620e"
HASH_TAGGED    = "ff260833edf142911047af6024eb634a"

URL_GRAPHQL          = "https://www.instagram.com/graphql/query/"
URL_WEB_PROFILE_INFO = "https://www.instagram.com/api/v1/users/web_profile_info/"

# ---------------- Helpers ----------------

def sanitize_filename(name: str) -> str:
    try:
        return re.sub(r'[\\/:*?"<>|]+', '_', (name or '').strip())
    except Exception:
        return "output"

def rnd_sleep():
    time.sleep(random.uniform(SLEEP_MIN, SLEEP_MAX))

def safe_json_response(resp: requests.Response) -> Dict[str, Any]:
    ct = resp.headers.get("content-type", "")
    if "application/json" not in ct:
        raise RuntimeError(
            f"Expected JSON but got content-type={ct} "
            f"status={resp.status_code}. "
            f"Body head={resp.text[:200]!r}"
        )
    return resp.json()

def normalize_username(input_str: str) -> str:
    s = input_str.strip()
    if not s:
        return s
    if s.startswith("http://") or s.startswith("https://"):
        try:
            parsed = urllib.parse.urlparse(s)
            path   = (parsed.path or "").strip("/")
            if not path:
                return ""
            seg = path.split("/")[0]
            if seg.lower() in {"p", "reel", "reels", "stories", "explore"}:
                return ""
            return seg
        except Exception:
            return ""
    return s

def _extract_cookie_fields(cookie_str: str) -> Dict[str, str]:
    """Pull useful token fields out of the raw Cookie header string."""
    result: Dict[str, str] = {}
    for name in ("csrftoken", "ds_user_id", "ig_www_claim", "sessionid", "mid", "ig_did"):
        m = re.search(rf"{name}=([^;]+)", cookie_str)
        if m:
            result[name] = m.group(1).strip()
    return result

def build_session(cookie_str: str) -> requests.Session:
    """
    Build a session that can hit both GraphQL and the private /api/v1/ endpoints.

    The private API returns the HTML login-wall when:
      - Accept header is missing or set to */* (IG interprets it as a browser navigation)
      - Sec-Fetch-Mode is not 'cors'  (IG detects non-XHR and redirects to login)
      - X-CSRFToken / X-IG-WWW-Claim are absent (auth checks fail silently)

    All four issues are fixed here.
    """
    fields = _extract_cookie_fields(cookie_str)

    s = requests.Session()
    s.headers.update({
        "User-Agent":        DEFAULT_UA_WEB,
        "X-IG-App-ID":       X_IG_APP_ID,
        # *** Critical: must be application/json, not */* ***
        # Using */* makes IG treat the request as a browser page load → HTML wall
        "Accept":            "application/json, text/plain, */*",
        "Accept-Language":   "en-US,en;q=0.9",
        "Accept-Encoding":   "gzip, deflate, br",
        "Referer":           "https://www.instagram.com/",
        "Origin":            "https://www.instagram.com",
        "X-Requested-With":  "XMLHttpRequest",
        "X-ASBD-ID":         "129477",
        # *** Critical: cors + same-origin tells IG this is an XHR, not navigation ***
        "Sec-Fetch-Site":    "same-origin",
        "Sec-Fetch-Mode":    "cors",
        "Sec-Fetch-Dest":    "empty",
        "Cookie":            cookie_str,
    })
    if fields.get("csrftoken"):
        s.headers["X-CSRFToken"] = fields["csrftoken"]
    if fields.get("ig_www_claim"):
        s.headers["X-IG-WWW-Claim"] = fields["ig_www_claim"]
    if fields.get("ds_user_id"):
        dsid = fields["ds_user_id"]
        s.headers["IG-U-DS-USER-ID"]     = dsid
        s.headers["IG-INTENDED-USER-ID"]  = dsid
    return s

def get_json(session: requests.Session, url: str, params: Dict[str, Any],
             extra_headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    resp = session.get(url, params=params,
                       headers=extra_headers or {}, timeout=30)
    return safe_json_response(resp)

def download_and_base64(session: requests.Session, url: str,
                        referer: Optional[str] = None) -> str:
    hdrs = {
        "Accept":        "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Cache-Control": "no-cache",
        "Referer":       referer or "https://www.instagram.com/",
    }
    try:
        resp = session.get(url, timeout=30, stream=True,
                           headers=hdrs, allow_redirects=True)
    except Exception:
        return ""
    if resp.status_code != 200:
        return ""
    ct = resp.headers.get("content-type", "image/jpeg")
    if not ct.startswith("image/"):
        return ""
    try:
        b64 = base64.b64encode(resp.content).decode("ascii")
        return f"data:{ct};base64,{b64}"
    except Exception:
        return ""

def linkify(text: str) -> Tuple[str, List[str], List[str]]:
    if not text:
        return "", [], []
    mentions = re.findall(r"@([A-Za-z0-9._]+)", text)
    hashtags = re.findall(r"#(\w+)", text)
    safe = html.escape(text)

    def repl_mention(m):
        u = m.group(1)
        return f'<a href="https://www.instagram.com/{html.escape(u)}/">@{html.escape(u)}</a>'

    def repl_hashtag(m):
        tag = m.group(1)
        return (
            f'<a href="https://www.instagram.com/explore/tags/{html.escape(tag)}/">'
            f'#{html.escape(tag)}</a>'
        )

    safe = re.sub(r"@([A-Za-z0-9._]+)", repl_mention, safe)
    safe = re.sub(r"#(\w+)",             repl_hashtag, safe)
    return safe, mentions, hashtags

def human_time(ts: Optional[int]) -> str:
    if not ts:
        return ""
    try:
        return time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(ts))
    except Exception:
        return str(ts)

# ---------------- Profile ----------------

def fetch_profile_info(session: requests.Session, username: str) -> Dict[str, Any]:
    user = None
    try:
        data = get_json(session, URL_WEB_PROFILE_INFO, {"username": username})
        user = data.get("data", {}).get("user")
    except Exception:
        pass

    if not user or not user.get("edge_owner_to_timeline_media", {}).get("edges"):
        alt_url = f"https://www.instagram.com/{username}/"
        try:
            alt_resp = session.get(
                alt_url,
                params={"__a": "1", "__d": "dis"},
                headers={"Referer": alt_url},
                timeout=30,
            )
            if "application/json" in alt_resp.headers.get("content-type", ""):
                alt = alt_resp.json()
                alt_user = (
                    alt.get("graphql", {}).get("user")
                    or alt.get("user")
                    or alt.get("data", {}).get("user")
                )
                if alt_user:
                    user = alt_user
        except Exception:
            pass

    if not user:
        raise RuntimeError("Profile info not found from either endpoint.")
    return user

# ---------------- Followers / Following ----------------

def paginate_follow(session: requests.Session, user_id: str,
                    follow_type: str, limit: int) -> List[Dict[str, Any]]:
    assert follow_type in ("followers", "following")
    hash_id = HASH_FOLLOWERS if follow_type == "followers" else HASH_FOLLOWING
    nodes: List[Dict[str, Any]] = []
    after = None
    first = min(PAGE_SIZE_FOLLOWS, limit)
    while len(nodes) < limit:
        variables: Dict[str, Any] = {
            "id":           str(user_id),
            "include_reel": True,
            "fetch_mutual": False,
            "first":        first,
        }
        if after:
            variables["after"] = after
        params = {
            "query_hash": hash_id,
            "variables":  json.dumps(variables, separators=(",", ":")),
        }
        data  = get_json(session, URL_GRAPHQL, params)
        key   = "edge_followed_by" if follow_type == "followers" else "edge_follow"
        block = data.get("data", {}).get("user", {}).get(key, {})
        for e in block.get("edges", []):
            node = e.get("node")
            if node:
                nodes.append(node)
            if len(nodes) >= limit:
                break
        page_info = block.get("page_info", {})
        if not page_info.get("has_next_page"):
            break
        after = page_info.get("end_cursor")
        if not after:
            break
        rnd_sleep()
    return nodes

# ---------------- Timeline feed fallback ----------------

def fetch_timeline_via_feed(session: requests.Session, user_id: str,
                            limit: int) -> List[Dict[str, Any]]:
    collected: List[Dict[str, Any]] = []
    count    = min(50, max(1, limit))
    max_id: Optional[str] = None
    base_url = f"https://www.instagram.com/api/v1/feed/user/{user_id}/"
    while len(collected) < limit:
        params: Dict[str, Any] = {"count": str(count)}
        if max_id:
            params["max_id"] = max_id
        try:
            resp = session.get(base_url, params=params, timeout=30)
            data = safe_json_response(resp)
        except Exception as e:
            print(f"[WARN] feed fallback failed: {e}")
            break
        for it in (data.get("items") or []):
            shortcode    = it.get("code") or it.get("shortcode") or ""
            media_id_str = it.get("id") or ""
            media_pk     = it.get("pk") or ""
            if not media_pk and media_id_str:
                m = re.match(r"(\d+)", str(media_id_str))
                if m:
                    media_pk = m.group(1)
            disp = ""
            for c in (((it.get("image_versions2") or {}).get("candidates")) or []):
                disp = (c or {}).get("url", "")
                if disp:
                    break
            if not disp:
                disp = it.get("thumbnail_url") or ""
            cap          = (it.get("caption") or {}).get("text", "")
            product_type = it.get("product_type") or ""
            if not product_type and it.get("media_type") == 2:
                if it.get("clips_metadata") or it.get("music_metadata"):
                    product_type = "clips"
            collected.append({
                "shortcode":             shortcode,
                "media_id":              media_id_str or media_pk or "",
                "media_pk":              str(media_pk) if media_pk else "",
                "display_url":           disp,
                "taken_at_timestamp":    it.get("taken_at"),
                "product_type":          product_type,
                "edge_liked_by":         {"count": it.get("like_count") or 0},
                "edge_media_to_comment": {"count": it.get("comment_count") or 0},
                "edge_media_to_caption": {"edges": [{"node": {"text": cap}}]},
            })
            if len(collected) >= limit:
                break
        max_id = data.get("next_max_id")
        if not max_id:
            break
        rnd_sleep()
    return collected

# ---------------- Likes ----------------

def fetch_post_likes(session: requests.Session, shortcode: str,
                     limit: int) -> List[Dict[str, Any]]:
    nodes: List[Dict[str, Any]] = []
    after = None
    first = min(PAGE_SIZE_LIKES, limit)
    while len(nodes) < limit:
        variables: Dict[str, Any] = {
            "shortcode":    shortcode,
            "include_reel": True,
            "first":        first,
        }
        if after:
            variables["after"] = after
        params = {
            "query_hash": HASH_LIKES,
            "variables":  json.dumps(variables, separators=(",", ":")),
        }
        data = get_json(session, URL_GRAPHQL, params)
        edge = (
            data.get("data", {})
                .get("shortcode_media", {})
                .get("edge_liked_by", {})
        )
        for e in edge.get("edges", []):
            node = e.get("node")
            if node:
                nodes.append(node)
            if len(nodes) >= limit:
                break
        page_info = edge.get("page_info", {})
        if not page_info.get("has_next_page"):
            break
        after = page_info.get("end_cursor")
        if not after:
            break
        rnd_sleep()
    return nodes

def fetch_likers_by_media_id(session: requests.Session, media_id: str,
                              limit: int,
                              referer: Optional[str] = None) -> List[Dict[str, Any]]:
    if not media_id:
        return []
    ref = referer or "https://www.instagram.com/"
    url = f"https://www.instagram.com/api/v1/media/{media_id}/likers/"
    try:
        resp = session.get(url, params={"count": str(min(200, limit))},
                           headers={"Referer": ref}, timeout=30)
        data = safe_json_response(resp)
    except Exception as e:
        print(f"[WARN] media likers failed: {e}")
        return []
    raw = data.get("users") or data.get("likers") or data.get("items") or []
    out: List[Dict[str, Any]] = []
    for u in raw:
        if len(out) >= limit:
            break
        obj = (u.get("user") if isinstance(u, dict) else None) or (u if isinstance(u, dict) else {})
        if obj.get("username"):
            out.append({
                "username":  obj.get("username", ""),
                "full_name": obj.get("full_name", "") or obj.get("fullName", ""),
            })
    return out

# ---------------- Comments ----------------

def _normalize_comment(c: Dict[str, Any]) -> Dict[str, Any]:
    """Unify GraphQL and private-API comment shapes into one consistent dict."""
    owner: Dict[str, str] = {}
    if c.get("owner"):
        owner = {
            "username":  c["owner"].get("username", ""),
            "full_name": c["owner"].get("full_name", ""),
        }
    elif c.get("user"):
        owner = {
            "username":  c["user"].get("username", ""),
            "full_name": c["user"].get("full_name", ""),
        }
    return {
        "id":         str(c.get("pk") or c.get("id") or ""),
        "text":       c.get("text", ""),
        "created_at": c.get("created_at") or c.get("created_at_utc"),
        "like_count": (
            c.get("comment_like_count")
            or c.get("like_count")
            or (c.get("edge_liked_by") or {}).get("count", 0)
        ),
        "owner": owner,
    }


def _fetch_comments_private_api(session: requests.Session,
                                 media_id: str,
                                 limit: int,
                                 referer: str = "https://www.instagram.com/") -> List[Dict[str, Any]]:
    """
    Fetch comments via IG's private /api/v1/media/{id}/comments/ endpoint.

    Root cause of the HTML login-wall bug:
      The session's default Accept header was '*/*'. When IG's CDN/backend
      receives Accept: */* on an /api/v1/ path it treats the request as a
      browser page-load and returns the React SPA HTML instead of JSON.
      Setting Accept: application/json in build_session() fixes this globally.

    We still pass Referer per-request for extra safety.
    We try composite ID (pk_ownerid) first, then numeric pk only.
    """
    if not media_id:
        return []

    media_id_str = str(media_id).strip()
    numeric_id   = media_id_str.split("_")[0]
    id_candidates = [media_id_str]
    if numeric_id != media_id_str:
        id_candidates.append(numeric_id)

    url_templates = [
        "https://www.instagram.com/api/v1/media/{mid}/comments/",
        "https://i.instagram.com/api/v1/media/{mid}/comments/",
    ]

    for mid in id_candidates:
        for url_tpl in url_templates:
            url    = url_tpl.format(mid=mid)
            out: List[Dict[str, Any]] = []
            max_id: Optional[str]    = None
            page   = 0

            while len(out) < limit and page < 20:
                params: Dict[str, Any] = {
                    "can_support_threading": "true",
                    "count": str(min(PAGE_SIZE_COMMENTS, limit - len(out))),
                }
                if max_id:
                    params["max_id"] = max_id

                try:
                    resp = session.get(
                        url, params=params,
                        headers={"Referer": referer},
                        timeout=30,
                    )
                    data = safe_json_response(resp)
                except Exception as e:
                    print(f"[WARN] comments fetch failed ({url}): {e}")
                    break

                raw = (
                    data.get("comments")
                    or data.get("items")
                    or (data.get("data") or {}).get("comments")
                    or []
                )
                if not raw:
                    break

                for c in raw:
                    if len(out) >= limit:
                        break
                    out.append(_normalize_comment(c))

                max_id = data.get("next_max_id") or data.get("next_min_id")
                if not max_id:
                    break
                page += 1
                rnd_sleep()

            if out:
                print(f"[i]   Comments via private API ({mid}): {len(out)}")
                return out

    return []


def _fetch_comments_graphql(session: requests.Session, shortcode: str,
                             limit: int) -> List[Dict[str, Any]]:
    """
    GraphQL comment fetch — best-effort, works only for old short-form shortcodes.
    New base64-style shortcodes silently return empty shortcode_media here.
    """
    nodes: List[Dict[str, Any]] = []
    after = None
    first = min(PAGE_SIZE_COMMENTS, limit)
    while len(nodes) < limit:
        variables: Dict[str, Any] = {"shortcode": shortcode, "first": first}
        if after:
            variables["after"] = after
        params = {
            "query_hash": HASH_COMMENTS,
            "variables":  json.dumps(variables, separators=(",", ":")),
        }
        try:
            data = get_json(session, URL_GRAPHQL, params)
        except Exception as e:
            print(f"[WARN] GraphQL comments request failed: {e}")
            break

        shortcode_media = (data.get("data") or {}).get("shortcode_media")
        if not shortcode_media:
            break

        edge = shortcode_media.get("edge_media_to_comment") or {}
        for e in edge.get("edges", []):
            node = e.get("node")
            if node:
                nodes.append(_normalize_comment(node))
            if len(nodes) >= limit:
                break

        page_info = edge.get("page_info", {})
        if not page_info.get("has_next_page"):
            break
        after = page_info.get("end_cursor")
        if not after:
            break
        rnd_sleep()

    return nodes


def fetch_post_comments(session: requests.Session,
                        shortcode: str,
                        limit: int,
                        media_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Cascade:
      1. Private API via media_id  (primary — handles new long-form shortcodes)
      2. GraphQL via shortcode     (fallback for old-format shortcodes)
    """
    referer = (
        f"https://www.instagram.com/p/{shortcode}/"
        if shortcode else "https://www.instagram.com/"
    )

    # Method 1: private API
    if media_id:
        print(f"[i]   Trying private-API comments (media_id={str(media_id)[:30]})...")
        try:
            nodes = _fetch_comments_private_api(session, media_id, limit, referer=referer)
            if nodes:
                return nodes
        except Exception as e:
            print(f"[WARN] Private API comments exception: {e}")

    # Method 2: GraphQL
    if shortcode:
        print(f"[i]   Trying GraphQL comments (shortcode={shortcode[:20]})...")
        try:
            nodes = _fetch_comments_graphql(session, shortcode, limit)
            if nodes:
                return nodes
        except Exception as e:
            print(f"[WARN] GraphQL comments exception: {e}")

    print(f"[WARN] All comment methods exhausted for shortcode={shortcode[:20]}")
    return []

# ---------------- Tagged ----------------

def fetch_tagged(session: requests.Session, user_id: str,
                 limit: int) -> List[Dict[str, Any]]:
    nodes: List[Dict[str, Any]] = []
    after = None
    first = min(24, limit)
    while len(nodes) < limit:
        variables: Dict[str, Any] = {"id": str(user_id), "first": first}
        if after:
            variables["after"] = after
        params = {
            "query_hash": HASH_TAGGED,
            "variables":  json.dumps(variables, separators=(",", ":")),
        }
        data  = get_json(session, URL_GRAPHQL, params)
        media = (
            data.get("data", {})
                .get("user", {})
                .get("edge_user_to_photos_of_you", {})
        )
        for e in media.get("edges", []):
            node = e.get("node")
            if node:
                nodes.append(node)
            if len(nodes) >= limit:
                break
        page_info = media.get("page_info", {})
        if not page_info.get("has_next_page"):
            break
        after = page_info.get("end_cursor")
        if not after:
            break
        rnd_sleep()
    return nodes

# ---------------- HTML report ----------------

def build_html_report(out_path: str, username: str, user_id: str,
                      profile: Dict[str, Any],
                      followers: List[Dict[str, Any]],
                      following: List[Dict[str, Any]],
                      posts: List[Dict[str, Any]],
                      reels: List[Dict[str, Any]],
                      tagged: List[Dict[str, Any]]):
    esc = html.escape

    def user_link(u: str) -> str:
        if not u:
            return ""
        return f'<a href="https://www.instagram.com/{esc(u)}/">@{esc(u)}</a>'

    def followers_html(lst: List[Dict[str, Any]]) -> str:
        return "\n".join(
            f'<li>{user_link(n.get("username", ""))} '
            f'<span class="muted">{esc(n.get("full_name", ""))}</span></li>'
            for n in lst
        )

    def comments_html(comments: List[Dict[str, Any]]) -> str:
        rows = []
        for c in comments:
            owner    = c.get("owner") or {}
            username = owner.get("username", "")
            text     = c.get("text", "")
            ts       = human_time(c.get("created_at"))
            lk       = c.get("like_count") or 0
            rows.append(
                f'<li>{user_link(username)}: {esc(text)} '
                f'<span class="muted">{esc(ts)}'
                f'{(" · ❤ " + str(lk)) if lk else ""}'
                f'</span></li>'
            )
        return "\n".join(rows)

    def likes_html(likes: List[Dict[str, Any]]) -> str:
        return "\n".join(
            f'<li>{user_link(n.get("username", ""))}</li>' for n in likes
        )

    def post_card(n: Dict[str, Any], idx: int, kind: str = "Post") -> str:
        shortcode = n.get("shortcode", "")
        url       = f"https://www.instagram.com/p/{shortcode}/" if shortcode else "#"
        ts        = human_time(n.get("taken_at_timestamp"))
        edges     = n.get("edge_media_to_caption", {}).get("edges", [])
        caption   = edges[0].get("node", {}).get("text", "") if edges else ""
        caption_html, mentions, _ = linkify(caption)
        media_uri = (
            n.get("display_url")
            or n.get("thumbnail_src")
            or ((n.get("display_resources") or [{}])[-1] or {}).get("src", "")
            or ((n.get("thumbnail_resources") or [{}])[-1] or {}).get("src", "")
        )
        embedded       = n.get("_embedded_media_b64") or ""
        likes_nodes    = n.get("_likes", [])
        comments_nodes = n.get("_comments", [])
        chips          = " ".join(
            f'<a class="chip" href="https://www.instagram.com/{html.escape(m)}/">'
            f'@{html.escape(m)}</a>'
            for m in mentions
        )
        parts = [
            f'<div class="card">',
            f'<div class="meta"><a href="{esc(url)}">{esc(kind)} {idx}</a></div>',
            f'<div class="muted">{esc(ts)}</div>',
        ]
        if embedded:
            parts.append(f'<img class="media" src="{embedded}" alt="media">')
        elif media_uri:
            parts.append(f'<img class="media" src="{esc(media_uri)}" alt="media">')
        parts += [
            f'<div class="chips">{chips}</div>',
            f'<div><strong>Caption</strong><br><pre>{caption_html}</pre></div>',
            (
                f'<div class="kpis">'
                f'<div class="kpi">❤ Likes: {esc(str(n.get("edge_liked_by", {}).get("count", "")))}</div>'
                f'<div class="kpi">💬 Comments: {esc(str(n.get("edge_media_to_comment", {}).get("count", "")))}</div>'
                f'</div>'
            ),
            (
                f'<details><summary>Likes ({len(likes_nodes)})</summary>'
                f'<div class="content"><ul class="list">{likes_html(likes_nodes)}</ul></div></details>'
            ),
            (
                f'<details><summary>Comments ({len(comments_nodes)})</summary>'
                f'<div class="content"><ul class="list">{comments_html(comments_nodes)}</ul></div></details>'
            ),
            f'</div>',
        ]
        return "\n".join(parts)

    p               = profile
    profile_pic_uri = p.get("profile_pic_url_hd") or p.get("profile_pic_url") or ""
    profile_emb     = p.get("_embedded_profile_pic_b64") or ""

    css = (
        "body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;"
        "margin:0;padding:20px;background:#0b0c10;color:#e6edf3}"
        "a{color:#6ab7ff;text-decoration:none}a:hover{text-decoration:underline}"
        ".muted{color:#9aa4b2;font-size:.9em}"
        ".header{display:flex;gap:16px;align-items:center}"
        ".avatar{width:100px;height:100px;border-radius:50%;object-fit:cover;border:2px solid #1f6feb}"
        ".kpis{display:flex;gap:12px;margin:8px 0;flex-wrap:wrap}"
        ".kpi{background:#111827;padding:6px 10px;border-radius:10px;border:1px solid #1f2937}"
        ".section{margin:28px 0}"
        ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}"
        ".card{background:#0e1117;border:1px solid #1f2937;border-radius:12px;padding:12px}"
        ".media{width:100%;border-radius:8px;display:block;margin-bottom:8px}"
        ".list{list-style:none;padding:0;margin:0}"
        ".list li{padding:6px 0;border-bottom:1px solid #1f2937}"
        ".chips .chip{margin-right:6px}"
        "details{background:#0e1117;border:1px solid #1f2937;border-radius:10px;margin:8px 0}"
        "details>summary{cursor:pointer;padding:10px;font-weight:600;list-style:none;display:block}"
        "details>summary::after{content:'▸';float:right;color:#9aa4b2}"
        "details[open]>summary{border-bottom:1px solid #1f2937}"
        "details[open]>summary::after{content:'▾'}"
        "details .content{padding:10px;overflow:auto}"
        "pre{white-space:pre-wrap}"
    )

    html_doc = (
        f'<!doctype html><html lang="en"><head>'
        f'<meta charset="utf-8"/>'
        f'<meta name="viewport" content="width=device-width,initial-scale=1"/>'
        f'<title>Instagram Report – {esc(username)}</title>'
        f'<style>{css}</style></head><body>'
        f'<h1>Instagram Report – {esc(username)}</h1>'
        f'<div class="section header">'
    )

    if profile_emb:
        html_doc += f'<img class="avatar" src="{profile_emb}" alt="avatar">'
    elif profile_pic_uri:
        html_doc += f'<img class="avatar" src="{esc(profile_pic_uri)}" alt="avatar">'

    bio_linkified, _, _ = linkify(p.get("biography", "") or "")
    bio_linkified = re.compile(r"(https?://[\w\-._~:/?#\[\]@!$&'()*+,;=%]+)").sub(
        lambda m: f'<a href="{html.escape(m.group(1))}">{html.escape(m.group(1))}</a>',
        bio_linkified,
    )

    html_doc += (
        f'<div><h2><a href="https://www.instagram.com/{esc(username)}/">@{esc(username)}</a></h2>'
        f'<div class="muted">ID: {esc(user_id)}</div>'
        f'<div class="kpis">'
        f'<div class="kpi">Posts: {esc(str(p.get("edge_owner_to_timeline_media", {}).get("count", "")))}</div>'
        f'<div class="kpi">Followers: {esc(str(p.get("edge_followed_by", {}).get("count", "")))}</div>'
        f'<div class="kpi">Following: {esc(str(p.get("edge_follow", {}).get("count", "")))}</div>'
        f'</div>'
        f'<div><strong>Full name</strong>: {esc(p.get("full_name", ""))}</div>'
        f'<div><strong>Bio</strong><br><pre>{bio_linkified}</pre></div>'
    )

    bio_links = p.get("bio_links") or []
    if isinstance(bio_links, list) and bio_links:
        link_chips = [
            f'<a class="chip" href="{html.escape(u)}">{html.escape(u)}</a>'
            for bl in bio_links
            for u in [(bl or {}).get("url") or (bl or {}).get("link_url") or ""]
            if u
        ]
        if link_chips:
            html_doc += '<div class="chips">' + " ".join(link_chips) + '</div>'

    fb_link = p.get("fb_profile_biolink")
    fb_url  = (
        fb_link if isinstance(fb_link, str)
        else ((fb_link or {}).get("link_url") or (fb_link or {}).get("url"))
        if isinstance(fb_link, dict) else None
    )
    if fb_url:
        html_doc += (
            f'<div class="chips"><span class="muted">Facebook:</span> '
            f'<a class="chip" href="{html.escape(fb_url)}">{html.escape(fb_url)}</a></div>'
        )
    if p.get("external_url"):
        html_doc += (
            f'<div><strong>External URL</strong>: '
            f'<a href="{esc(p["external_url"])}">{esc(p["external_url"])}</a></div>'
        )
    html_doc += "</div></div>"

    html_doc += (
        f'<div class="section"><details><summary>Followers ({len(followers)})</summary>'
        f'<div class="content"><ul class="list">{followers_html(followers)}</ul></div></details></div>'
        f'<div class="section"><details><summary>Following ({len(following)})</summary>'
        f'<div class="content"><ul class="list">{followers_html(following)}</ul></div></details></div>'
    )
    for section_title, items, kind in [
        ("Posts",  posts,  "Post"),
        ("Reels",  reels,  "Reel"),
        ("Tagged", tagged, "Tagged"),
    ]:
        html_doc += (
            f'<div class="section"><h3>{section_title}</h3><div class="grid">'
            + "\n".join(post_card(n, i, kind) for i, n in enumerate(items, 1))
            + '</div></div>'
        )
    html_doc += "</body></html>"

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html_doc)
    print(f"[i] HTML report saved to {os.path.abspath(out_path)}")

# ---------------- Main ----------------

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path   = os.path.join(script_dir, ".env")
    load_dotenv(env_path)

    cookie_val = os.getenv("INSTAGRAM_COOKIE")
    if not cookie_val:
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                raw = f.read().strip()
            if raw:
                cookie_val = (
                    raw.split("=", 1)[1].strip()
                    if raw.startswith("INSTAGRAM_COOKIE=") else raw
                )
        except Exception as e:
            print(f"[ERROR] Could not read .env: {e}")
    if not cookie_val:
        print("[ERROR] Instagram cookie not found. Set INSTAGRAM_COOKIE= in .env")
        sys.exit(1)

    print("=== Instagram Full Harvester ===")
    profile_input = input("Profile URL or username: ").strip()
    if not profile_input:
        print("[ERROR] Username required.")
        sys.exit(1)

    session  = build_session(cookie_val)
    username = normalize_username(profile_input) or profile_input

    print(f"[i] Fetching profile for @{username} ...")
    try:
        profile = fetch_profile_info(session, username)
    except Exception as e:
        print("[ERROR] fetch_profile_info:", e)
        sys.exit(1)

    user_id = str(profile.get("id") or profile.get("pk") or "")
    if not user_id:
        print("[WARN] Could not detect user_id.")

    out_html = sanitize_filename(f"{username} | Insta") + ".html"

    pic_url = profile.get("profile_pic_url_hd") or profile.get("profile_pic_url")
    if pic_url:
        emb = download_and_base64(session, pic_url)
        if emb:
            profile["_embedded_profile_pic_b64"] = emb
        rnd_sleep()

    print(f"[i] Fetching up to {MAX_FOLLOWS} followers ...")
    followers_nodes = paginate_follow(session, user_id, "followers", MAX_FOLLOWS)
    followers = [
        {"username": n.get("username", ""), "full_name": n.get("full_name", "")}
        for n in followers_nodes
    ]

    print(f"[i] Fetching up to {MAX_FOLLOWS} following ...")
    following_nodes = paginate_follow(session, user_id, "following", MAX_FOLLOWS)
    following = [
        {"username": n.get("username", ""), "full_name": n.get("full_name", "")}
        for n in following_nodes
    ]

    timeline_block = profile.get("edge_owner_to_timeline_media", {})
    timeline_nodes = [
        e.get("node", {})
        for e in timeline_block.get("edges", [])[:MAX_POSTS]
        if e.get("node")
    ]
    if not timeline_nodes and (timeline_block.get("count") or 0) > 0:
        print("[i] Timeline empty — using feed fallback ...")
        try:
            timeline_nodes = fetch_timeline_via_feed(session, user_id, MAX_POSTS)
        except Exception:
            pass

    posts: List[Dict[str, Any]] = []
    reels: List[Dict[str, Any]] = []
    total = len(timeline_nodes)
    print(f"[i] Processing {total} posts ...")

    for idx, node in enumerate(timeline_nodes, 1):
        shortcode = node.get("shortcode") or ""
        raw_mid   = node.get("media_id") or node.get("id") or node.get("media_pk") or ""
        media_id  = str(raw_mid).strip() if raw_mid else ""

        print(f"[i] [{idx}/{total}] shortcode={shortcode[:24]}  media_id={media_id}")

        # Likes
        likes_nodes: List[Dict[str, Any]] = []
        if shortcode:
            try:
                likes_nodes = fetch_post_likes(session, shortcode, MAX_LIKES_PER_POST)
                print(f"[i]   Likes (GraphQL): {len(likes_nodes)}")
            except Exception as e:
                print(f"[WARN] Likes GraphQL: {e}")
        if not likes_nodes and media_id:
            ref = f"https://www.instagram.com/p/{shortcode}/" if shortcode else "https://www.instagram.com/"
            try:
                likes_nodes = fetch_likers_by_media_id(
                    session, media_id, MAX_LIKES_PER_POST, referer=ref)
                print(f"[i]   Likes (media-id): {len(likes_nodes)}")
            except Exception as e:
                print(f"[WARN] Likes media-id: {e}")

        # Comments
        comments_nodes: List[Dict[str, Any]] = []
        try:
            comments_nodes = fetch_post_comments(
                session, shortcode, MAX_COMMENTS_PER_POST, media_id=media_id)
            print(f"[i]   Comments total: {len(comments_nodes)}")
        except Exception as e:
            print(f"[WARN] Comments: {e}")

        # Embed image
        embedded = ""
        if node.get("display_url"):
            ref      = f"https://www.instagram.com/p/{shortcode}/" if shortcode else None
            embedded = download_and_base64(session, node["display_url"], referer=ref)

        node["_embedded_media_b64"] = embedded
        node["_likes"]              = [
            {"username": ln.get("username", "")}
            for ln in likes_nodes if ln.get("username")
        ]
        node["_comments"] = comments_nodes

        if node.get("product_type") == "clips":
            reels.append(node)
        else:
            posts.append(node)

        rnd_sleep()

    # Tagged
    tagged_nodes = fetch_tagged(session, user_id, MAX_TAGGED)
    tagged: List[Dict[str, Any]] = []
    for n in tagged_nodes[:MAX_TAGGED]:
        sc       = n.get("shortcode") or ""
        raw_mid  = n.get("media_id") or n.get("id") or n.get("media_pk") or ""
        media_id = str(raw_mid).strip() if raw_mid else ""
        ref      = f"https://www.instagram.com/p/{sc}/" if sc else "https://www.instagram.com/"

        candidates: List[str] = []
        for key in ("display_url", "thumbnail_src"):
            v = n.get(key)
            if v and v not in candidates:
                candidates.append(v)
        for rs in (n.get("display_resources") or [])[::-1]:
            v = (rs or {}).get("src")
            if v and v not in candidates:
                candidates.append(v)
        side = n.get("edge_sidecar_to_children", {}).get("edges", [])
        if side:
            child = (side[0] or {}).get("node", {})
            for key in ("display_url", "thumbnail_src"):
                v = child.get(key)
                if v and v not in candidates:
                    candidates.append(v)

        emb = ""
        for u in candidates:
            emb = download_and_base64(session, u, referer=ref)
            if emb:
                break
        n["_embedded_media_b64"] = emb

        likes_nodes: List[Dict[str, Any]] = []
        if sc:
            try:
                likes_nodes = fetch_post_likes(session, sc, MAX_LIKES_PER_POST)
            except Exception:
                pass
        if not likes_nodes and media_id:
            try:
                likes_nodes = fetch_likers_by_media_id(
                    session, media_id, MAX_LIKES_PER_POST, referer=ref)
            except Exception:
                pass

        comments_nodes_t: List[Dict[str, Any]] = []
        try:
            comments_nodes_t = fetch_post_comments(
                session, sc, MAX_COMMENTS_PER_POST, media_id=media_id)
        except Exception:
            pass

        n["_likes"]    = [{"username": ln.get("username", "")} for ln in likes_nodes if ln.get("username")]
        n["_comments"] = comments_nodes_t
        tagged.append(n)
        rnd_sleep()

    print(
        f"[i] Followers:{len(followers)} Following:{len(following)} "
        f"Posts:{len(posts)} Reels:{len(reels)} Tagged:{len(tagged_nodes)}"
    )
    print("[i] Building HTML ...")
    try:
        build_html_report(out_html, username, user_id, profile,
                          followers, following, posts, reels, tagged)
    except Exception as e:
        print("[ERROR] build_html_report:", e)
        sys.exit(1)
    print("[i] Done.")


if __name__ == "__main__":
    main()
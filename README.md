# Egg (Tunisia) — UGC Creator Marketplace (MVP)

A Next.js-based marketplace connecting brands and agencies with UGC creators using an in-app coin economy (1 DT = 10 Coins).

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Scripts](#scripts)
- [Admin Setup](#admin-setup)
- [Instagram UGC Creator Scoring API](#instagram-ugc-creator-scoring-api)

## Overview

This MVP marketplace enables brands to discover and collaborate with UGC creators through a coin-based payment system. Creators can showcase their profiles, manage orders, and withdraw earnings, while brands can browse creators, purchase coin packages, and place orders.

## Features

- **Authentication**: Email/password registration and login with JWT tokens
- **Discovery Feed**: Browse creators with niche and rating filters
- **Creator Profiles**: View detailed profiles with coin-based first visits
- **Coin Economy**: Purchase coin packages and manage wallet balances
- **Order Management**: Create, track, and complete orders between brands and creators
- **Reviews System**: Rate completed collaborations
- **Creator Dashboard**: Manage availability and process withdrawals (10% commission)
- **Admin Panel**: Verify users, manage withdrawals, coin packages, and content moderation

## Tech Stack

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB Atlas + Mongoose
- **Authentication**: JWT (stored in localStorage)

## Requirements

- Node.js v22 (see `.nvmrc`)
- MongoDB Atlas database

## Installation

1. **Install Node.js v22**:
   ```bash
   nvm use v22
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment setup**:
   ```bash
   cp .env.example .env
   ```
   Configure the following variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: A secure secret for JWT token signing

4. **Start development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **(Optional) Seed database**:
   ```bash
   npm run seed
   ```

## Usage

- Register as a brand or creator
- Browse creators on the discovery feed
- Purchase coins to unlock creator profiles
- Place orders and manage collaborations
- Leave reviews after completed orders

## Scripts

- `npm run dev` — Start the Next.js development server
- `npm run build` — Create a production build
- `npm start` — Run the production server (after build)
- `npm run lint` — Run ESLint for code quality
- `npm run seed` — Populate MongoDB with sample data

## Admin Setup

Registration does not automatically create admin users. To create an admin:

1. Register a normal user account
2. Update the user's role in MongoDB:
   - Set `users.role` to `"admin"` for the user's document

## Instagram UGC Creator Scoring API

An intelligent API that analyzes Instagram profiles and scores them for UGC video creation potential.

### Overview

This tool analyzes any Instagram username and provides a comprehensive evaluation including UGC scoring, engagement metrics, audience quality assessment, estimated rates, and niche recommendations.

### Features

- **UGC Score (0-100)**: Evaluates suitability for branded content creation
- **Engagement Metrics**: Analyzes likes, comments, and engagement rates
- **Audience Quality**: Detects real followers vs. bots
- **Estimated Rates**: Suggests potential compensation per video
- **Niche Analysis**: Identifies best-fit categories (fashion, food, travel, etc.)

### How It Works

1. **Data Scraping**: Extracts profile information, posts, followers, and engagement data from Instagram
2. **AI Analysis**: Uses DeepSeek AI to evaluate 5 key metrics:
   - Engagement Rate (30%)
   - Content Quality (25%)
   - Audience Authenticity (20%)
   - Reach Potential (15%)
   - Professionalism (10%)
3. **JSON Output**: Returns structured data ready for integration

### Tech Stack

- **API Server**: Python + Flask
- **AI Engine**: DeepSeek AI
- **Data Source**: Instagram scraping

### Setup

1. **Create virtual environment**:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Environment variables**:
   ```bash
   cp .env.example .env
   ```
   Configure:
   - `DEEPSEEK_API_KEY`: Your DeepSeek AI API key
   - `INSTAGRAM_COOKIE`: Instagram session cookie (see below)

4. **Run the API server**:
   ```bash
   python api_server.py
   ```

### Getting Instagram Cookies

> **⚠️ Note**: Do not share your `.env` file or Instagram cookies publicly.

1. Log in to Instagram in your web browser
2. Open Developer Tools (F12 or right-click → Inspect)
3. Go to the Network tab
4. Visit any Instagram page (e.g., your feed)
5. Click on any request to `www.instagram.com`
6. In the Headers tab, find the `cookie` header
7. Copy the entire cookie string
8. It should look like: `mid=...; ig_did=...; csrftoken=...; ds_user_id=...; sessionid=...`


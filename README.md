# mindCanva Server 🎨

Backend API for mindCanva - handles all the database , user data, and artwork management.

**Live API:** [mindCanva Server](https://mind-canvas-server-dun.vercel.app)

---

## What's Inside

This server does five main things:

**1. Manages Users** - Saves new accounts, checks for duplicates, and lets people update their profile info.

**2. Handles Artworks** - Stores all artwork details, lets artists add/edit/delete their work, and keeps everything organized by date.

**3. Powers Search** - Find artworks by title or artist name. Filter by category too - like paintings, digital art, or sculptures.

**4. Tracks Likes** - Counts how many likes each artwork gets. Makes sure nobody can spam likes on the same piece.

**5. Saves Favorites** - When  love an artwork, save it to your personal collection .

---

## Built With

- Node.js + Express for the API
- MongoDB for the database
- Some useful packages like CORS and dotenv

---

## Main Routes

```
POST   /users              - Sign up new user
PUT    /users/profile      - Update profile

GET    /artworks           - All public artworks
GET    /artworks/latest    - 6 newest pieces
POST   /artworks           - Add new artwork
PUT    /artworks/:id       - Edit artwork
DELETE /artworks/:id       - Remove artwork

GET    /search             - Search & filter
GET    /categories         - All categories
PATCH  /artworks/:id/like  - Like artwork

POST   /favorites          - Add favorite
GET    /favorites          - My favorites
DELETE /favorites/:id      - Remove favorite

GET    /artists/top        - Top 3 artists
```

---
 

## Database Structure

We use 4 collections:

- `artworks` - All artwork data
- `users` - User accounts
- `favorites` - Saved artworks
- `likes` - Like records

---

## What It Can Do

- Create user accounts  
- Store artworks with public/private  
- Search by title or artist  
- Filter by category  
- Like system  
 -  Save favorites  
 - Show top artists by total likes  
 
---

## Deployment

Hosted on Vercel.  

---

Made for the art community.
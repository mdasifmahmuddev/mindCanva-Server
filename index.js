require('dotenv').config();

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@mindcanvas.ah8atu6.mongodb.net/?appName=mindCanvas`;

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  await client.connect();
  await client.db("admin").command({ ping: 1 });
  console.log("Connected to MongoDB!");

  const db = client.db("mindcanva-db");

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

async function getCollections() {
  const { db } = await connectToDatabase();
  return {
    artworks: db.collection("artworks"),
    userCollection: db.collection('users'),
    favoritesCollection: db.collection('favorites'),
    likesCollection: db.collection('likes')
  };
}

app.get('/', (req, res) => {
  res.send('mindCanva Server is running!');
});

app.post('/users', async (req, res) => {
  try {
    const { userCollection } = await getCollections();
    const newUser = req.body;
    const email = req.body.email;
    
    if (!email || !email.includes('@')) {
      return res.status(400).send({ error: 'Invalid email format' });
    }
    
    const query = { email: email };
    const existingUser = await userCollection.findOne(query);

    if (existingUser) {
      return res.send({ message: 'user already exists', insertedId: null });
    } else {
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to create user' });
  }
});

app.put('/users/profile', async (req, res) => {
  try {
    const { artworks, userCollection } = await getCollections();
    const { email, displayName, photoURL } = req.body;
    const filter = { email: email };
    const update = {
      $set: {
        displayName: displayName,
        photoURL: photoURL,
        updatedAt: new Date()
      }
    };
    const options = { upsert: true };
    const result = await userCollection.updateOne(filter, update, options);

    await artworks.updateMany(
      { created_by: email },
      {
        $set: {
          artist_name: displayName,
          artist_photo: photoURL
        }
      }
    );

    const artworkCount = await artworks.countDocuments({ created_by: email });   

    res.send({
      success: true,
      result,
      artworkCount   
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to update profile' });
  }
});

app.get('/artworks', async (req, res) => {
  try {
    const { artworks } = await getCollections();
    const limit = parseInt(req.query.limit) || 100;  
    const result = await artworks
      .find({ visibility: 'Public' })
      .limit(limit)  
      .toArray();
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to fetch artworks' });
  }
});

app.get('/artworks/latest', async (req, res) => {
  try {
    const { artworks } = await getCollections();
    const result = await artworks
      .find({ visibility: 'Public' })
      .sort({ created_at: -1 })
      .limit(6)
      .toArray();
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to fetch latest artworks' });
  }
});

app.get('/categories', async (req, res) => {
  try {
    const { artworks } = await getCollections();
    const allArtworks = await artworks.find({ visibility: 'Public' }).toArray();
    const categories = [...new Set(allArtworks.map(art => art.category).filter(cat => cat))];
    res.send(categories);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to fetch categories' });
  }
});

app.get('/artworks/category/:category', async (req, res) => {
  try {
    const { artworks } = await getCollections();
    const category = req.params.category;
    const result = await artworks.find({
      category: category,
      visibility: 'Public'
    }).toArray();
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to fetch artworks by category' });
  }
});

app.get('/artworks/:id', async (req, res) => {
  try {
    const { artworks } = await getCollections();
    const { id } = req.params;
    const result = await artworks.findOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to fetch artwork' });
  }
});

app.get('/my-artworks', async (req, res) => {
  try {
    const { artworks } = await getCollections();
    const email = req.query.email;
    const sortBy = req.query.sort || 'created_at';   
    const sortOrder = req.query.order === 'asc' ? 1 : -1;   
    
    const result = await artworks
      .find({ created_by: email })
      .sort({ [sortBy]: sortOrder })   
      .toArray();
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to fetch user artworks' });
  }
});

app.get('/artworks/artist/:email', async (req, res) => {
  try {
    const { artworks } = await getCollections();
    const email = req.params.email;
    const result = await artworks.find({ created_by: email }).toArray();
    const artistPhoto = result.length > 0 ? result[0].artist_photo : '';
    res.send({
      artist_photo: artistPhoto,
      total: result.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to fetch artist info' });
  }
});

app.post('/artworks', async (req, res) => {
  try {
    const { artworks } = await getCollections();
    const data = req.body;
    data.created_at = new Date();
    const result = await artworks.insertOne(data);
    res.send({
      success: true,
      result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to create artwork' });
  }
});

app.put('/artworks/:id', async (req, res) => {
  try {
    const { artworks } = await getCollections();
    const { id } = req.params;
    const data = req.body;
    const filter = { _id: new ObjectId(id) };
    const update = {
      $set: data,
    };
    const result = await artworks.updateOne(filter, update);
    res.send({
      success: true,
      result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to update artwork' });
  }
});

app.delete('/artworks/:id', async (req, res) => {
  try {
    const { artworks } = await getCollections();
    const { id } = req.params;
    const result = await artworks.deleteOne({ _id: new ObjectId(id) });
    res.send({
      success: true,
      result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to delete artwork' });
  }
});

app.patch('/artworks/:id/like', async (req, res) => {
  try {
    const { artworks, likesCollection } = await getCollections();
    const { id } = req.params;
    const { user_email } = req.body;

    const artwork = await artworks.findOne({ _id: new ObjectId(id) });
    if (!artwork) {
      return res.status(404).send({ error: 'Artwork not found' });
    }

    const existingLike = await likesCollection.findOne({
      artwork_id: id,
      user_email: user_email
    });

    if (existingLike) {
      return res.send({ success: false, message: 'Already liked' });
    }

    await likesCollection.insertOne({
      artwork_id: id,
      user_email: user_email,
      created_at: new Date()
    });

    const filter = { _id: new ObjectId(id) };
    const update = { $inc: { likes: 1 } };
    const result = await artworks.updateOne(filter, update);

    res.send({ success: true, result });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to like artwork' });
  }
});

app.get('/likes/check', async (req, res) => {
  try {
    const { likesCollection } = await getCollections();
    const { artwork_id, user_email } = req.query;

    const existingLike = await likesCollection.findOne({
      artwork_id: artwork_id,
      user_email: user_email
    });

    res.send({ hasLiked: !!existingLike });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to check like' });
  }
});

app.post('/favorites', async (req, res) => {
  try {
    const { favoritesCollection } = await getCollections();
    const data = req.body;

    const existingFavorite = await favoritesCollection.findOne({
      artwork_id: data.artwork_id,
      user_email: data.user_email
    });

    if (existingFavorite) {
      return res.send({
        success: false,
        message: 'Already in favorites',
        alreadyExists: true
      });
    }

    data.created_at = new Date();
    const result = await favoritesCollection.insertOne(data);
    res.send({
      success: true,
      result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to add favorite' });
  }
});

app.get('/favorites', async (req, res) => {
  try {
    const { favoritesCollection } = await getCollections();
    const email = req.query.email;
    const result = await favoritesCollection.find({ user_email: email }).toArray();
    res.send({
      favorites: result,
      total: result.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to fetch favorites' });
  }
});

app.get('/favorites/check', async (req, res) => {
  try {
    const { favoritesCollection } = await getCollections();
    const { artwork_id, user_email } = req.query;

    const existingFavorite = await favoritesCollection.findOne({
      artwork_id: artwork_id,
      user_email: user_email
    });

    res.send({ isFavorited: !!existingFavorite });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to check favorite' });
  }
});

app.delete('/favorites/:id', async (req, res) => {
  try {
    const { favoritesCollection } = await getCollections();
    const { id } = req.params;
    const result = await favoritesCollection.deleteOne({ _id: new ObjectId(id) });
    res.send({
      success: true,
      result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to remove favorite' });
  }
});

app.get('/search', async (req, res) => {
  try {
    const { artworks } = await getCollections();
    const searchText = req.query.search;
    const category = req.query.category;   

    const query = { visibility: 'Public' };

    if (searchText) {
      query.$or = [
        { title: { $regex: searchText, $options: 'i' } },
        { artist_name: { $regex: searchText, $options: 'i' } }
      ];
    }

    if (category) {   
      query.category = category;
    }

    const result = await artworks.find(query).toArray();
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to search artworks' });
  }
});

app.get('/artists/top', async (req, res) => {
  try {
    const { artworks } = await getCollections();
    const topArtists = await artworks.aggregate([
      { $match: { visibility: 'Public' } },
      {
        $group: {
          _id: '$created_by',
          artist_name: { $first: '$artist_name' },
          artist_email: { $first: '$created_by' },
          artist_photo: { $first: '$artist_photo' },
          total_likes: { $sum: '$likes' },
          total_artworks: { $sum: 1 }
        }
      },
      { $sort: { total_likes: -1 } },
      { $limit: 3 }
    ]).toArray();

    res.send(topArtists);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to fetch top artists' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
// const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');

dotenv.config();

const uri = process.env.MONGODB_URI;
const port = process.env.PORT || 8000;
const app = express();

//middleware
app.use(cors());
app.use(express.json());

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db('hireloop_db');
    const jobsCollection = db.collection('jobs');
    const companyCollection = db.collection('companies');
    const usersCollection = db.collection('user');

    app.get('/api/users', async (req, res) => {
      try {
        const users = await usersCollection.find();
        const result = await users.toArray();
        res.send(result);
      } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Error fetching users');
      }
    });

    app.get('/api/jobs/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const job = await jobsCollection.findOne(query);
        res.send(job);
      } catch (error) {
        console.error('Error fetching job:', error);
        res.status(500).send('Error fetching job');
      }
    });

    app.get('/api/jobs', async (req, res) => {
      try {
        const query = {};
        if (req.query.companyId) {
          query.companyId = req.query.companyId;
        }
        if (req.query.status) {
          query.status = req.query.status;
        }
        const jobs = await jobsCollection.find(query).toArray();
        res.send(jobs);
      } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).send('Error fetching jobs');
      }
    });

    app.post('/api/jobs', async (req, res) => {
      try {
        const jobData = req.body;
        const newJob = {
          ...jobData,
          createdAt: new Date(),
        };
        const result = await jobsCollection.insertOne(newJob);
        res.send(result);
      } catch (error) {
        console.error('Error inserting job:', error);
        res.status(500).send('Error inserting job');
      }
    });

    // api for my companies

    app.get('/api/companies', async (req, res) => {
      try {
        const companies = await companyCollection.find().toArray();
        res.send(companies);
      } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).send('Error fetching companies');
      }
    });

    app.get('/api/my/companies', async (req, res) => {
      try {
        const query = {};
        if (req.query.recruiterId) {
          query.recruiterId = req.query.recruiterId;
        }
        const company = await companyCollection.findOne(query);
        res.status(200).json({
          success: true,
          data: company || null,
        });
      } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({
          success: false,
          error: 'Error fetching companies',
          data: null,
        });
      }
    });

    app.post('/api/companies/', async (req, res) => {
      try {
        const company = req.body;

        if (!company.name || !company.recruiterId) {
          return res.status(400).json({
            success: false,
            error: 'Company name and recruiter ID are required',
          });
        }

        const newCompany = {
          ...company,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: company.status || 'Pending',
        };

        const result = await companyCollection.insertOne(newCompany);

        res.status(201).json({
          success: true,
          data: result,
          message: 'Company created successfully',
        });
      } catch (error) {
        console.error('Error inserting company:', error);
        res.status(500).json({
          success: false,
          error: 'Error inserting company: ' + error.message,
        });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!',
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('This is HireLoop Server');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

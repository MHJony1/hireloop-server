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
// app.use(express.json());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
    const applicationsCollection = db.collection('applications');
    const planCollection = db.collection('plans');
    const subscriptionCollection = db.collection('subscriptions');

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

    //application related api

    app.get('/api/applications', async (req, res) => {
      try {
        const query = {};
        if (req.query.applicantId) {
          query.applicantId = req.query.applicantId;
        }
        if (req.query.jobId) {
          query.jobId = req.query.jobId;
        }
        const applications = await applicationsCollection.find(query).toArray();
        res.send(applications);
      } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).send('Error fetching applications');
      }
    });

    app.post('/api/applications', async (req, res) => {
      try {
        const application = req.body;
        const newApplication = {
          ...application,
          createdAt: new Date(),
        };
        const result = await applicationsCollection.insertOne(newApplication);
        res.status(201).send(result);
      } catch (error) {
        console.error('Error inserting application:', error);
        res.status(500).send('Error inserting application');
      }
    });



    // all companies get with recruiter email api
    app.get('/api/companies-with-emails', async (req, res) => {
      try {
        const companies = await companyCollection.find().toArray();

        const recruiterIds = [
          ...new Set(companies.map((c) => c.recruiterId).filter(Boolean)),
        ];

        const recruiters = await db
          .collection('user')
          .find({
            _id: { $in: recruiterIds.map((id) => new ObjectId(id)) },
          })
          .toArray();

        const recruiterMap = {};
        recruiters.forEach((rec) => {
          recruiterMap[rec._id.toString()] = rec;
        });

        const companiesWithEmail = companies.map((company) => ({
          ...company,
          email: company.recruiterId
            ? recruiterMap[company.recruiterId]?.email || 'N/A'
            : 'N/A',
          recruiterName: company.recruiterId
            ? recruiterMap[company.recruiterId]?.name || 'N/A'
            : 'N/A',
        }));

        res.status(200).json({
          success: true,
          data: companiesWithEmail,
        });
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
          success: false,
          error: 'Error fetching companies',
        });
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

    app.patch("/api/companies/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedCompany = req.body;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            status: updatedCompany.status
          }
        }
        const result = await companyCollection.updateOne(filter, updatedDoc);
        res.send(result);
      } catch (error) {
          console.error('Error updating company:', error);
          res.status(500).send('Error updating company');
      }
    })

    //plans related api
    app.get('/api/plans', async (req, res) => {
      try {
        const query = {};
        if (req.query.plan_id) {
          query.id = req.query.plan_id;
        }
        const plan = await planCollection.findOne(query);
        res.send(plan);
      } catch (error) {
        console.error('Error fetching plans:', error);
        res.status(500).send('Error fetching plans');
      }
    });

    //subscriptions related api
    app.post('/api/subscriptions', async (req, res) => {
      try {
        const data = req.body;
        const subsInfo = {
          ...data,
          createdAt: new Date(),
        };
        const result = await subscriptionCollection.insertOne(subsInfo);
        //update the user plan information
        const filter = { email: data.email };
        const updateDocument = {
          $set: {
            plan: data.planId,
          },
        };
        const updateResult = await usersCollection.updateOne(
          filter,
          updateDocument,
        );
        res.status(201).send(updateResult);
      } catch (error) {
        console.error('Error inserting subscription:', error);
        res.status(500).send('Error inserting subscription');
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

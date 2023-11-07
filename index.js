const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5010;
const cookieParser = require('cookie-parser');


app.use(cors({
    origin: ["http://localhost:5173"],
    credentials: true,
}))
app.use(express.json())
app.use(cookieParser)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.glcj3l3.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const assignmentsCollection = client.db('onlineGroupStudy').collection('assignments');
        const takeAssignmentsCollection = client.db("onlineGroupStudy").collection('takeAssignments');

        app.post('/access-token',(req, res) => {
            const body = req.body;
            const token = jwt.sign(body,process.env.DB_ACCESS_TOKEN,{expiresIn : "1h"});
            res
            .cookie("token",token,{
                httpOnly : true,
                secure : true,
                sameSite : "none"
            })
            .send({success : true});
        })

        app.get('/assignmentCount', async (req, res) => {
            const count = await assignmentsCollection.estimatedDocumentCount();
            res.send({ count })
        })

        app.post('/take-assignment', async (req, res) => {
            const body = req.body;
            const result = await takeAssignmentsCollection.insertOne(body);
            res.send(result);
        })

        app.get('/take-assignment/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await takeAssignmentsCollection.findOne(query);
            res.send(result);
        })

        app.patch('/take-assignment/:id', async (req, res) => {
            const id = req.params.id;
            const body = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    ...body
                },
            };
            const result = await takeAssignmentsCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.get('/take-assignment', async (req, res) => {
            let query = {};
            if (req?.query?.userEmail) {
                query = { userEmail: req.query.userEmail }
            }
            const result = await takeAssignmentsCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/create-assignment', async (req, res) => {
            const body = req.body;
            const result = await assignmentsCollection.insertOne(body);
            res.send(result);
        })

        app.get('/create-assignment', async (req, res) => {
            const page = parseInt(req.query.page);
            const items = parseInt(req.query.items);
            const result = await assignmentsCollection.find({}).skip(page * items).limit(items).toArray();
            res.send(result);
        })

        app.get('/create-assignment/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await assignmentsCollection.findOne(query);
            res.send(result);
        })

        app.delete('/create-assignment/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const findOne = await assignmentsCollection.findOne(query);
            const body = req.body;
            const findEmail = findOne.email;
            const userEmail = body?.email;
            if (findEmail === userEmail) {
                const result = await assignmentsCollection.deleteOne(query);
                res.send(result);
            }
            else {
                res.send({ message: "You cannot delete this assignment" })
            }
        })

        app.put('/create-assignment/:id', async (req, res) => {
            const body = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    ...body
                },
            };
            const result = await assignmentsCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Online group study server is running');
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})
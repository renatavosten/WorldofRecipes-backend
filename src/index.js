import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import data from './store';
import cors from 'cors';
import connect from './db.js';
import mongo from 'mongodb';
import auth from './auth.js';

const app = express(); // instanciranje aplikacije
const port = 3000; // port na kojem će web server slušati

app.use(cors());
app.use(express.json());

let checkAttributes= (data)=>{
    if (!data.postedBy || !data.naziv || !data.slika || !data.priprema || !data.vrijeme || !data.kategorija ){
        return false;
    }
    return true;
};

app.post('/auth', async (req, res) => {
    let user = req.body;

    try {
        let result = await auth.authenticateUser(user.mail, user.password);
        res.json(result);
    } catch (e) {
        res.status(401).json({ error: e.message });
    }

});

app.post('/users', async (req, res) => {
    let user = req.body;

    let id;
    try {
        id = await auth.registerUser(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }

    res.json({ id: id });
});

app.post('/recepti', [auth.verify], async (req, res) => {
    let data= req.body;
    //postavi vrijeme i datum posta
    //zelimo validan id pa pustamo da ga mongo postavi
    delete data._id;

    let check= checkAttributes(data);
    if(!check){
        res.json({
            status: "fail",
            reason:"incomplete post",
        });
        return 
    }
    
    let db= await connect();

    let result= await db.collection("recepti").insertOne(data);
    

    if(result && result.insertedCount == 1){
        res.json(result.ops[0]);
    }
    else {
        res.json({
            status: "fail",
        });
    }
});

app.get('/tajna', [auth.verify], (req, res) => {
    res.json({ message: 'Ovo je tajna ' + req.jwt.mail });
});

// recepti po id-u
app.get('/recepti/:id', [auth.verify], async (req,res )=> {
    let id= req.params.id;
    let db = await connect();
    
    let doc= await db.collection("recepti").findOne({_id: mongo.ObjectId(id)});
    console.log(doc);
    res.json(doc);
    
});
    
app.get('/recepti', [auth.verify], async (req, res) => {
    let db = await connect(); // pristup db objektu    
    let cursor = await db.collection("recepti").find();  
    let results = await cursor.toArray();
            
    res.json(results) 
});


app.listen(port, () => console.log(`Slušam na portu ${port}!`));










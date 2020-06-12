import mongo from 'mongodb';
import connect from './db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

let funkcija = async () => {
    let db = await connect();
    await db.collection('users').createIndex({ username: 1 }, { unique: true });  //poziva se jednom kod starta app
};

funkcija();

export default {
    //metoda koja prima podatke korisnika i sprema ih u bazu
    async registerUser(userData) {
        let db = await connect();

        //objekt s podacima korisnika
        let doc = {
            username: userData.username,
            password: await bcrypt.hash(userData.password, 8), //hashirana lozinka
            mail: userData.mail,
        };
        try {
            let result = await db.collection('users').insertOne(doc);
            if (result && result.insertedId) {
                return result.insertedId;
            }
        } catch (e) {
            if (e.name == "MongoError" && e.code == 11000) {
                throw new Error("Korisnik već postoji")
            }
        }  
    },
    //metoda koja provjerava postoji li korisnik u bazi
    async authenticateUser(mail, password) {
        let db = await connect();
        let user = await db.collection("users").findOne({ mail: mail });

        if (user && user.password && (await bcrypt.compare(password, user.password))) {
            delete user.password;
            let token = jwt.sign(user, process.env.JWT_SECRET, {
                algorithm: "HS512",
                expiresIn: "1 week",
            });
            return {
                token,
                mail: user.mail,
            };
        } 
        else {
            throw new Error("Cannot authenticate");
        }
    },
    //provjerava da li je token ispravan
    verify(req, res, next) {
        try {
            let authorization = req.headers.authorization.split(' '); //bearer token dobivamo i splitamo po razmaku
            let type = authorization[0]; //tip tokena - bearer tip tokena
            let token = authorization[1];
    
            if (type !== "Bearer") {
                return res.status(401).send();
            }
            else {
                req.jwt = jwt.verify(token, process.env.JWT_SECRET);
                return next();
            }
        } catch (e) {
            return res.status(401).send();
        }
    }
};
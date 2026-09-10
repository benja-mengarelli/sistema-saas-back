import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';

export const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/sessions',
        ttl: 60*3600 // 1 hora
    }),
    cookie: {
        maxAge: 60*3600*1000 // 1 hora
    }
};
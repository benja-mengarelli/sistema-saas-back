import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import './config/firebase.config.js';
import dotenv from 'dotenv';
import cors from 'cors';
import router from './routes/index.js';

/*! importar el front url  */

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares para parsear el cuerpo de las solicitudes y servir archivos estáticos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// hace que exista request.cookies y request.signedCookies
app.use(cookieParser());

app.use(cors({ origin: [process.env.FRONT_URL, 'http://localhost:5173'] }));

//! Rutas
app.use("/", router);

// Conexión a MongoDB
try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Conectado a MongoDB');

    // Iniciar el servidor
    app.listen(PORT, () => {
        console.log(`Servidor escuchando en el puerto http://localhost:${PORT}`);
    });

} catch (error) {
    console.error('Error al conectar a MongoDB:', error);
}
import mongoose from 'mongoose';

// Ejecuta fn(session) dentro de una transacción. Si fn lanza un error, se revierte todo
// y el error se relanza tal cual (conserva el status que le pusiste con errorHttp).
export async function conTransaccion(fn) {
    const session = await mongoose.startSession();
    try {
        let resultado;
        await session.withTransaction(async () => {
            resultado = await fn(session);
        });
        return resultado;
    } finally {
        await session.endSession();
    }
}
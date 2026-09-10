import { db } from '../config/firebase.config.js';
import { Product } from '../models/product.model.js';
import { hashear, verificarCodigo, extraerKey } from '../helper/bcryptHelper.js';
import { InviteCode } from "../models/inviteCodeModel.js"

export const mostrarEmpresas = async () => {
    try {
        const uid = req.user.uid; // Obtener el UID del usuario autenticado

        const empresasSnapshot = await db.collection('empresas').get();

        const empresas = empresasSnapshot.docs.filter(doc => {
            doc.data().miembros.some(miembro => miembro.uid === uid);
        }).map(doc => ({ id: doc.id, nombre: doc.data().nombre }));

        return empresas;
    } catch (error) {
        console.error('Error al mostrar empresas:', error);
        throw new Error('Error al mostrar empresas');
    }
};

export const crearCodigoInvitacion = async () => {
    try{

    } catch (error) {
        console.error('Error al crear codigo:', error);
        throw new Error('Error al crear codigo');
    }
}

export const agregarEmpresa = async (codigo) => {
    try{
        const lookUpKey = extraerKey(inviteCode)

        const invitacion = await InviteCode.findByLookupKey(lookUpKey);
        if (!invitacion) throw new Error("codigo Invalido");

        const invitacionValida = await verificarCodigo(codigo, invitacion.codigohasheado)
        if (!invitacionValida) throw new Error("codigo invalido")

        if (!invitacion.active) throw new Error("codigo desactivado")

        await db
            .collection("empresas")
            .doc(invitacion.empresaId)
            .collection("miembros")
            .doc(req.user.uid)
            .set({
                rol: invitacion.rol
            })
        
        return invitacion.empresaId
    }
    catch (error) {
        console.error("Error al agregar usuario")
    }
}
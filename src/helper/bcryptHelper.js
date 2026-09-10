import * as bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export async function hashear(codigo) {
    return bcrypt.hash(codigo, SALT_ROUNDS);
}

export async function verificarCodigo(codigo, codigoHasheado){
    return bcrypt.compare(codigo, codigoHasheado);
}

export function extraerKey(codigoPlano){
    const partes = code.split("-");

    if (partes.length < 2) {
        throw new Error("Formato de codigo invalido")
    }

    return partes[1];
}
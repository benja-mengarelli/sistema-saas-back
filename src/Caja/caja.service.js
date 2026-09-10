import Caja from "./cajaModel.js";
import { construirIncrementos } from "../helper/facturacionCaja.service.js";

export const getCajas = async (empresaId) => {
    try {
        return await Caja.find({ empresaId }).sort({ fecha: -1 });
    } catch (error) {
        console.error("Error al obtener cajas:", error);
        throw new Error("Error al obtener cajas");
    }
};

export const getCajaById = async (empresaId, cajaId) => {
    try {
        return await Caja.findOne({ _id: cajaId, empresaId });
    } catch (error) {
        console.error("Error al obtener caja:", error);
        throw new Error("Error al obtener caja");
    }
};

export async function obtenerCajaAbierta(cajaId, empresaId, session) {
    const caja = await Caja.findOne({ _id: cajaId, empresaId, estado: "abierta" }).session(session);
    if (!caja) throw new Error("La caja indicada no existe o no está abierta");
    return caja;
}

export async function crearCajaDoc({ empresaId, fecha, abiertaPor, efectivoInicial = 0 }, session) {
    const [caja] = await Caja.create([{
        empresaId,
        fecha,
        abiertaPor,
        estado: "abierta",
        efectivo: { Inicial: efectivoInicial }
    }], { session });
    return caja;
}

export async function registrarIngreso(cajaId, { tipo, monto, motivo }, session) {
    await Caja.updateOne(
        { _id: cajaId, estado: "abierta" },
        { $push: { ingresos: { tipo, monto, motivo } } },
        { session }
    );
}

export async function registrarEgreso(cajaId, { tipo, monto, motivo }, session) {
    await Caja.updateOne(
        { _id: cajaId, estado: "abierta" },
        { $push: { egresos: { tipo, monto, motivo } } },
        { session }
    );
}

export async function registrarRetiro(cajaId, monto, session) {
    await Caja.updateOne(
        { _id: cajaId, estado: "abierta" },
        { $inc: { "efectivo.retirado": monto } },
        { session }
    );
}

export function calcularEsperado(caja) {
    const ingresosEfectivo = caja.ingresos
        .filter(i => i.tipo === "EFECTIVO")
        .reduce((acc, i) => acc + i.monto, 0);
    const egresosEfectivo = caja.egresos
        .filter(e => e.tipo === "EFECTIVO")
        .reduce((acc, e) => acc + e.monto, 0);

    return caja.efectivo.Inicial
        + caja.pagos.efectivo
        + ingresosEfectivo
        - egresosEfectivo
        - caja.efectivo.retirado;
}

export async function cerrarCajaDoc({ caja, efectivoFinal, cerradaPor }, session) {
    const esperado = calcularEsperado(caja);
    caja.efectivo.esperado = esperado;
    caja.efectivo.Final = efectivoFinal;
    caja.efectivo.diferencia = efectivoFinal - esperado;
    caja.estado = "cerrada";
    caja.cerradaPor = cerradaPor;
    await caja.save({ session });
    return caja;
}





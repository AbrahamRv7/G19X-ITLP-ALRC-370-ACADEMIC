from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

import database
import models
from security import get_current_user

router = APIRouter(tags=["6. Métricas Jurídicas"])


@router.get("/dashboard/kpis")
def obtener_kpis_principales(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    contratos_activos = db.query(models.Contrato).filter(models.Contrato.estatus == models.EstatusContrato.activo).count()
    riesgo_total = (
        db.query(func.sum(models.Litigio.monto_contingencia)).filter(models.Litigio.esta_activo == True).scalar() or 0.0
    )
    litigios_materia = db.query(models.Litigio.materia, func.count(models.Litigio.id)).group_by(models.Litigio.materia).all()
    desglose_materia = {
        (materia.value if hasattr(materia, "value") else str(materia)): cantidad
        for materia, cantidad in litigios_materia
    }

    hoy = datetime.now()
    limite_30_dias = hoy + timedelta(days=30)
    contratos_por_vencer = (
        db.query(models.Contrato)
        .filter(
            models.Contrato.fecha_vencimiento != None,
            models.Contrato.fecha_vencimiento >= hoy,
            models.Contrato.fecha_vencimiento <= limite_30_dias,
            models.Contrato.estatus != models.EstatusContrato.terminado,
        )
        .count()
    )

    return {
        "kpis": {
            "contratos_activos": contratos_activos,
            "contratos_por_vencer_30_dias": contratos_por_vencer,
            "riesgo_economico_total": float(riesgo_total),
            "litigios_por_materia": desglose_materia,
        }
    }


@router.get("/metricas/litigios-por-fase")
def metricas_litigios_por_fase(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    resultados = (
        db.query(models.Litigio.fase_procesal, func.count(models.Litigio.id).label("cantidad"))
        .group_by(models.Litigio.fase_procesal)
        .all()
    )
    return [{"fase": fila.fase_procesal, "cantidad": fila.cantidad} for fila in resultados]


@router.get("/metricas/riesgo-financiero")
def metricas_riesgo_financiero(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    resultados = (
        db.query(models.Litigio.probabilidad_exito, func.sum(models.Litigio.monto_contingencia).label("monto_total"))
        .group_by(models.Litigio.probabilidad_exito)
        .all()
    )
    return [
        {
            "probabilidad": (
                fila.probabilidad_exito.value
                if hasattr(fila.probabilidad_exito, "value")
                else (fila.probabilidad_exito or "No especificada")
            ),
            "monto_total": float(fila.monto_total or 0.0),
        }
        for fila in resultados
    ]


@router.get("/metricas/carga-trabajo")
def metricas_carga_trabajo(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    usuarios = db.query(models.Usuario).all()
    reporte_carga = []
    for u in usuarios:
        total_contratos = len(u.contratos) if u.contratos else 0
        total_litigios = len(u.litigios) if u.litigios else 0
        reporte_carga.append(
            {
                "usuario_id": u.id,
                "nombre": u.nombre,
                "rol": u.rol.value if hasattr(u.rol, "value") else str(u.rol),
                "total_contratos": total_contratos,
                "total_litigios": total_litigios,
                "carga_total_asuntos": total_contratos + total_litigios,
            }
        )
    return reporte_carga


@router.get("/metricas/tiempo-promedio-fases")
def metricas_tiempo_promedio_fases(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    litigios = db.query(models.Litigio).all()
    tiempos_por_fase: dict[str, list[float]] = {}
    ahora = datetime.now()

    for lit in litigios:
        cambios = (
            db.query(models.HistorialLitigio)
            .filter(models.HistorialLitigio.litigio_id == lit.id)
            .order_by(models.HistorialLitigio.fecha_cambio.asc())
            .all()
        )

        fecha_inicio_fase = lit.creado_en or ahora
        if not cambios:
            fase = (lit.fase_procesal or "Inicial").capitalize()
            dias = max((ahora - fecha_inicio_fase).total_seconds() / 86400.0, 0.1)
            tiempos_por_fase.setdefault(fase, []).append(dias)
        else:
            for cambio in cambios:
                fase_ant = (cambio.fase_anterior or "Inicio").capitalize()
                fecha_cambio = cambio.fecha_cambio or ahora
                dias = max((fecha_cambio - fecha_inicio_fase).total_seconds() / 86400.0, 0.1)
                tiempos_por_fase.setdefault(fase_ant, []).append(dias)
                fecha_inicio_fase = fecha_cambio

            fase_actual = (lit.fase_procesal or "Actual").capitalize()
            dias_actual = max((ahora - fecha_inicio_fase).total_seconds() / 86400.0, 0.1)
            tiempos_por_fase.setdefault(fase_actual, []).append(dias_actual)

    return [
        {
            "fase": fase,
            "dias_promedio": round(sum(lista) / len(lista), 1),
            "transiciones_evaluadas": len(lista),
        }
        for fase, lista in tiempos_por_fase.items()
    ]
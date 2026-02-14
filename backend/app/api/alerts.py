"""Alerts API 路由。"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.alerts import CheckAlertsResponse, CreateAlertRequest
from app.services.alerts import alerts_service

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("")
async def list_alerts():
    """取得所有提醒。"""
    data = await alerts_service.list_alerts()
    return {"data": data}


@router.post("")
async def create_alert(payload: CreateAlertRequest):
    """建立價格提醒。"""
    try:
        data = await alerts_service.create_alert(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"data": data}


@router.delete("/{alert_id}")
async def delete_alert(alert_id: str):
    """刪除提醒。"""
    deleted = await alerts_service.delete_alert(alert_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Alert not found: {alert_id}")
    return {"data": {"id": alert_id, "deleted": True}}


@router.post("/check")
async def check_alerts():
    """手動執行一次提醒檢查。"""
    result = await alerts_service.check_alerts()
    response = CheckAlertsResponse(**result)
    return {"data": response}

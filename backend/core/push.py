"""Expo Push API service.

Sends notifications to one or more registered Expo push tokens. Token format:
ExponentPushToken[xxxxxxxxxxxx]. Tokens are issued by expo-notifications on the
client and stored in db.users.push_token.

Docs: https://docs.expo.dev/push-notifications/sending-notifications/
"""
import asyncio
import logging
from typing import Iterable, List, Optional, Dict, Any
import httpx
from core.database import db

log = logging.getLogger(__name__)
EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'


async def _send_chunk(messages: List[Dict[str, Any]]):
    try:
        async with httpx.AsyncClient(timeout=10.0) as cli:
            r = await cli.post(
                EXPO_PUSH_URL,
                headers={'Accept': 'application/json', 'Content-Type': 'application/json'},
                json=messages,
            )
            if r.status_code >= 400:
                log.warning('Expo push error %s: %s', r.status_code, r.text[:300])
    except Exception as e:
        log.warning('Expo push failed: %s', e)


async def send_to_users(
    user_ids: Iterable[str],
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
    sound: str = 'default',
) -> int:
    """Lookup push tokens for the given user_ids and send a push to each.

    Returns the number of tokens we attempted to push to. Non-blocking: errors
    are swallowed + logged so a single bad token never breaks the calling route.
    """
    ids = [u for u in user_ids if u]
    if not ids:
        return 0

    cursor = db.users.find(
        {'id': {'$in': ids}, 'push_token': {'$exists': True, '$ne': None}},
        {'_id': 0, 'id': 1, 'push_token': 1},
    )
    targets = await cursor.to_list(1000)
    if not targets:
        return 0

    messages = [
        {
            'to': t['push_token'],
            'sound': sound,
            'title': title,
            'body': body,
            'data': data or {},
            'priority': 'high',
            'channelId': 'default',
        }
        for t in targets
        if isinstance(t.get('push_token'), str) and t['push_token'].startswith('ExponentPushToken')
    ]
    if not messages:
        return 0

    # Expo limits 100 per request; chunk just in case.
    for i in range(0, len(messages), 90):
        await _send_chunk(messages[i : i + 90])
    return len(messages)


def fire_and_forget(coro):
    """Schedule a coroutine without awaiting it, suppressing errors."""
    try:
        asyncio.create_task(coro)
    except Exception as e:
        log.warning('fire_and_forget scheduling failed: %s', e)

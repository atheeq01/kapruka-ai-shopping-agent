from typing import AsyncIterator
from contextlib import AsyncExitStack, asynccontextmanager
from mcp.client.streamable_http import streamablehttp_client
from mcp.client.session import ClientSession
from app.core.config import settings


class KaprukaMCPClient:
    """
    Stateless, multi-user-safe MCP client.

    Every chat request opens its OWN short-lived MCP session via ``new_session()``.
    Concurrent users therefore never share — and cannot corrupt or kill — a single
    connection. The session is opened and closed inside the *caller's* task, which
    satisfies anyio's "same task must enter and exit the cancel scope" requirement
    (the source of intermittent crashes when a single session is reconnected from
    arbitrary request tasks).
    """

    @asynccontextmanager
    async def new_session(self) -> AsyncIterator[ClientSession]:
        """
        Open an isolated MCP session for the lifetime of the ``async with`` block.

        Usage::

            async with mcp_client.new_session() as session:
                result = await session.call_tool(name, arguments=args)
        """
        async with AsyncExitStack() as stack:
            read_stream, write_stream, _ = await stack.enter_async_context(
                streamablehttp_client(settings.kapruka_mcp_url)
            )
            session = await stack.enter_async_context(
                ClientSession(read_stream, write_stream)
            )
            await session.initialize()
            yield session

    async def list_tools(self) -> list:
        """Fetch the MCP tool catalogue using a transient session."""
        async with self.new_session() as session:
            response = await session.list_tools()
            return response.tools


mcp_client = KaprukaMCPClient()

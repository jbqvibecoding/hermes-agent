/**
 * The Crew workspace, in the desktop app.
 *
 * Almost nothing here, on purpose: the workspace itself is `@hermes/crew-ui`,
 * the same source the dashboard plugin bundles. What this file owns is the one
 * thing the two shells genuinely differ on — how to authenticate against the
 * local backend.
 *
 * The desktop app already has a backend connection with a long-lived session
 * token, so there is no device flow, no OAuth and no ticket minting; Errand's
 * whole transport layer is beside the point here. The token goes in a header
 * for REST, and in a query parameter for the WebSocket, because a browser
 * cannot set headers on an upgrade request.
 */

import type * as React from 'react'

import { CrewWorkspace, HermesCrewClient, type CloudAgentsClient } from '@hermes/crew-ui'
import '@hermes/crew-ui/styles.css'
import { useEffect, useState } from 'react'

import { PageLoader } from '@/components/page-loader'
import { ErrorBanner } from '@/components/ui/error-state'

/** Where `_mount_plugin_api_routes` mounts the crew plugin's backend. */
const API_PATH = '/api/plugins/hermes-crew'
/** `hermes_cli/web_server.py:271`. */
const SESSION_HEADER = 'X-Hermes-Session-Token'

function eventsUrl(baseUrl: string, token: string): string {
  const url = new URL(`${API_PATH}/v1/events`, baseUrl)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  if (token) url.searchParams.set('token', token)
  return url.toString()
}

export function CrewView(): React.ReactElement {
  const [client, setClient] = useState<CloudAgentsClient>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    let alive = true
    void window.hermesDesktop
      .getConnection()
      .then(connection => {
        if (!alive) return
        setClient(
          new HermesCrewClient({
            baseUrl: `${connection.baseUrl.replace(/\/+$/, '')}${API_PATH}`,
            eventsUrl: eventsUrl(connection.baseUrl, connection.token),
            headers: (): Record<string, string> =>
              connection.token ? { [SESSION_HEADER]: connection.token } : {}
          })
        )
      })
      .catch((reason: unknown) => {
        if (alive) setError(reason instanceof Error ? reason.message : 'Could not reach the Hermes backend.')
      })
    return () => {
      alive = false
    }
  }, [])

  if (error) return <ErrorBanner>{error}</ErrorBanner>
  if (!client) return <PageLoader />

  return (
    <CrewWorkspace
      client={client}
      notify={({ body, title }) => {
        // The desktop shell owns notifications, so this rides its bridge
        // rather than the web Notification API.
        void window.hermesDesktop.notify({ body, title })
      }}
    />
  )
}

# frozen_string_literal: true

#
# Copyright (C) 2023 - present Instructure, Inc.
#
# This file is part of Canvas.
#
# Canvas is free software: you can redistribute it and/or modify it under
# the terms of the GNU Affero General Public License as published by the Free
# Software Foundation, version 3 of the License.
#
# Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
# WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
# A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
# details.
#
# You should have received a copy of the GNU Affero General Public License along
# with this program. If not, see <http://www.gnu.org/licenses/>.

# API implementation for PandataEvents
# https://gerrit.instructure.com/plugins/gitiles/PandataEvents/+/refs/heads/master/
#
# Allows Canvas to send arbitrary events to the PandataEvents service
# for further processing or querying.
#
# Why use this?
# - You need more metadata than Datadog tags can provide
# - You need to query these events to build dashboards around the data, but Canvas only sends
#   request logs to Splunk
# - These events are lightweight and the service can handle a Canvas-sized load
#
# Usage:
#   PandataEvents.send_event(:an_event, { context_id: 2, meta: :data }, for_user_id: @current_user.global_id)
module PandataEvents
  def self.credentials
    @credentials ||= Rails.application.credentials.pandata_creds&.with_indifferent_access || {}
  end

  def self.config
    @config ||= DynamicSettings.find("pandata/events", service: "canvas")
  end

  def self.endpoint
    @endpoint ||= config[:url]
  end

  # Whether or not PandataEvents is enabled for Canvas purposes,
  # since it's always available for specific dev keys
  # in UsersController#pandata_events_token
  def self.enabled?
    !!config[:enabled_for_canvas]
  end

  # Send data to the PandataEvents service, partitioned by `event_type`.
  def self.send_event(event_type, data, for_user_id: nil)
    return unless enabled?

    delay(
      priority: Delayed::LOW_PRIORITY,
      n_strand: ["pandata_events", event_type]
    ).post_event(event_type, data, for_user_id)
  end

  def self.post_event(event_type, data, sub)
    service = CredentialService.new(prefix: :canvas)
    auth_token = service.auth_token(sub)
    event_data = {
      timestamp: Time.now.utc.iso8601,
      eventType: event_type,
      appTag: service.app_key,
      properties: data
    }

    CanvasHttp.post(
      endpoint,
      { Authorization: "Bearer #{auth_token}" },
      content_type: "application/json",
      body: { events: [event_data] }.to_json
    )
  end
  private_class_method :post_event
end

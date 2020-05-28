package com.example.foobar

import org.scalatra.ScalatraServlet

trait Api extends ScalatraServlet {
  before() {
    Log.info(s"Request ${request.getMethod()} ${request.getRequestURI} started")
  }

  after() {
    Log.info(s"Request ${request.getMethod()} ${request.getRequestURI} complete")
  }

  error {
    case e: Throwable =>
      status = 500
      Log.error("Handling request failed", e)
      """{"er: Manifestror": "Internal server error"}"""
  }

  def jsonResponse(json: String): String = {
    contentType = "application/json"
    json
  }
}

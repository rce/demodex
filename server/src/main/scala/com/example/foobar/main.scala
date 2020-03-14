package com.example.foobar

import javax.servlet.ServletContext
import org.scalatra._
import org.eclipse.jetty.server.Server
import org.eclipse.jetty.webapp.WebAppContext
import org.scalatra.servlet.ScalatraListener

// https://scalatra.org/guides/2.5/deployment/standalone.html
object Main extends App {
  val port = 8080

  val context = new WebAppContext()
  context.setContextPath("/")
  context.setResourceBase("src/main/webapp")
  context.setInitParameter(ScalatraListener.LifeCycleKey, "com.example.foobar.ScalatraBootstrap")
  context.addEventListener(new ScalatraListener())

  val server = new Server(port)
  server.setHandler(context)
  server.start()
  server.join()
}

class ScalatraBootstrap extends LifeCycle {
  override def init(context: ServletContext) {
    context.mount(new FooApi(), "/api/*")
  }

  override def destroy(context: ServletContext) {
    super.destroy(context)
  }
}

class FooApi extends ScalatraServlet {
  get("/foo") {
    contentType = "application/json"
    """{"status": "SUCCESS"}"""
  }
}
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
  val db = new Database(new DatabaseConfig())
  get("/foo") {
    contentType = "application/json"

    okFromDatabase() match {
      case Some(ok) =>
        status = 200
        s"""{"status": "${ok}"}"""
      case None =>
        status = 500
        """{"status": "FAILURE"}"""

    }
  }

  def okFromDatabase() =
    db.inTransaction(_.selectOne("select 'OK'")(_.getString(1)))
}
package com.example.foobar

import javax.servlet.ServletContext
import org.scalatra._
import org.eclipse.jetty.server.Server
import org.eclipse.jetty.webapp.WebAppContext
import org.scalatra.servlet.ScalatraListener

// https://scalatra.org/guides/2.5/deployment/standalone.html
object Main extends App {
  checkDatabaseConnection()

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

  private def checkDatabaseConnection(): Unit = {
    try {
      val db = new Db(GlobalContext.dataSource)
      val one = db.selectOne("select 1")(_.getInt(1))
      Log.info(s"SELECT 1 == ${one}")
    } catch {
      case e: Throwable =>
        Log.error("database check failed", e)
        throw e
    }
  }
}

class ScalatraBootstrap extends LifeCycle {
  override def init(context: ServletContext) {
    context.mount(new FooApi(), "/api/*")
  }

  override def destroy(context: ServletContext) {
    super.destroy(context)
  }
}





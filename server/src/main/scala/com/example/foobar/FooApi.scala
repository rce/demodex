package com.example.foobar

class FooApi extends Api {
  val db = new Db(GlobalContext.dataSource) with FooDb

  get("/foo") {
    try {
      contentType = "application/json"

      db.okFromDatabase() match {
        case Some(ok) =>
          status = 200
          jsonResponse(Json.mkString(FooResponse(ok)))
        case None =>
          status = 500
          jsonResponse(Json.mkString(FooResponse("FAILURE")))
      }
    } catch {
      case e: Throwable =>
        status = 500
        jsonResponse(Json.mkString(ErrorResponse(e.getMessage)))
    }
  }
}

case class FooResponse(status: String)
case class ErrorResponse(error: String)

trait FooDb { this: Db =>
  def okFromDatabase(): Option[String] =
    selectOne("select 'OK'")(_.getString(1))
}

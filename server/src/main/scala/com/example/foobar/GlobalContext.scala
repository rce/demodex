package com.example.foobar

object GlobalContext {
  lazy val db = new Database(new DatabaseConfig())
}

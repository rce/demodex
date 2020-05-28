package com.example.foobar

object GlobalContext {
  val dataSource = new DataSource(new DatabaseConfig())
}

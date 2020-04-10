package com.example.foobar

import java.sql.{Connection, PreparedStatement, ResultSet}

import com.zaxxer.hikari.{HikariConfig, HikariDataSource}

import scala.collection.mutable.ArrayBuffer

class DatabaseConfig {
  val dbName = requireEnv("DATABASE_NAME")
  val username = requireEnv("DATABASE_USERNAME")
  val password = requireEnv("DATABASE_PASSWORD")
  val hostname = requireEnv("DATABASE_HOSTNAME")
  val port = requireEnv("DATABASE_PORT").toInt

  private def requireEnv(key: String) = Option(System.getenv(key))
    .getOrElse(throw new RuntimeException(s"Environment variable $key is required"))
}

class Database(dbConfig: DatabaseConfig) {
  val config = new HikariConfig()
  config.setJdbcUrl(s"jdbc:postgres://${dbConfig.hostname}:${dbConfig.port}/${dbConfig.dbName}")
  config.setDataSourceClassName("org.postgresql.ds.PGSimpleDataSource")
  config.setUsername(dbConfig.username)
  config.setPassword(dbConfig.password)
  config.setAutoCommit(false)
  val dataSource = new HikariDataSource(config)

  def inTransaction[T](func: (Transaction) => T): T = {
    withConnection { connection =>
      try {
        val tx = new Transaction(connection)
        tx.execute("BEGIN")
        val result = func(tx)
        connection.commit()
        result
      } catch {
        case e: Throwable =>
          connection.rollback()
          throw e
      }
    }
  }

  private def withConnection[T](func: Connection => T): T = {
    val connection = dataSource.getConnection()
    try {
      func(connection)
    } finally {
      connection.close()
    }
  }
}

class Transaction(val connection: Connection) {
  def selectOne[T](query: String, params: Any*)(func: (ResultSet) => T): Option[T] =
    select(query, params:_*)(func).headOption

  def select[T](query: String, params: Any*)(func: (ResultSet) => T): Seq[T] = {
    val statement = connection.prepareStatement(query)
    params.zipWithIndex.foreach { case (param, index) =>
      bind(statement, param, index + 1)
    }
    val resultSet = statement.executeQuery()
    val results = ArrayBuffer[T]()
    while (resultSet.next()) {
      results.addOne(func(resultSet))
    }
    results.toSeq
  }

  def execute(query: String, params: Any*): Unit = {
    val statement = connection.prepareStatement(query)
    params.zipWithIndex.foreach { case (param, index) =>
      bind(statement, param, index + 1)
    }
    statement.execute()
  }

  def bind(statement: PreparedStatement, param: Any, index: Int): Unit = param match {
    case s: String => statement.setString(index, s)
  }
}
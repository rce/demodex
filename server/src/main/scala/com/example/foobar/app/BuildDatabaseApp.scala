package com.example.foobar.app

import com.example.foobar.{Db, GlobalContext, Transaction}

object BuildDatabaseApp extends App {
  val db = new Db(GlobalContext.dataSource)

  db.inTransaction { tx =>
    renameOldSchema(tx)

    tx.execute("CREATE SCHEMA foo")
    tx.execute("""
      create table foo.tbl (
        tbl_id bigserial PRIMARY KEY,
        content text NOT NULL
      )
    """)

    tx.execute("insert into foo.tbl (content) values (?)", "testiteksti")

    val values = tx.select("select content from foo.tbl")(_.getString(1))
    println(values)
  }

  private def renameOldSchema(tx: Transaction) = {
    if (schemaExists(tx, "old_foo")) {
      tx.execute("DROP SCHEMA old_foo CASCADE")
    }
    if (schemaExists(tx, "foo")) {
      tx.execute("ALTER SCHEMA foo RENAME TO old_foo")
    }
  }

  def schemaExists(tx: Transaction, name: String): Boolean = {
    val countOpt = tx.selectOne("""
      SELECT count(*) FROM information_schema.schemata
      WHERE schema_name = ?
    """, name)(_.getInt(1))
    countOpt.exists(_ >= 1)
  }
}

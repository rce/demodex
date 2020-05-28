package com.example.foobar

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.scala.{DefaultScalaModule, ScalaObjectMapper}

object Json {
  val mapper = new ObjectMapper() with ScalaObjectMapper
  mapper.registerModule(DefaultScalaModule)

  def mkString[T](value: T)(implicit m: Manifest[T]): String =
    mapper.writeValueAsString(value)

  def parse[T](json: String)(implicit m: Manifest[T]): T =
    mapper.readValue[T](json)
}

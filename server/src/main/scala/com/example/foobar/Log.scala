package com.example.foobar

import org.apache.logging.log4j.LogManager

object Log {
  private val log = LogManager.getLogger("LOG")

  def debug(msg: String) = log.debug(msg)
  def info(msg: String) = log.info(msg)
  def error(msg: String) = log.error(msg)
  def error(msg: String, e: Throwable) = log.error(msg, e)
  def warn(msg: String) = log.warn(msg)
  def warn(msg: String, e: Throwable) = log.warn(msg, e)
}

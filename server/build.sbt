val scalatraVersion = "2.7.0"

lazy val root = (project in file("."))
  .settings(
    organization := "com.example",
    name := "foobar",
    version := "0.1-SNAPSHOT",
    scalaVersion := "2.13.1",
    libraryDependencies ++= Seq(
      "org.scalatra" %% "scalatra" % scalatraVersion,
      "org.eclipse.jetty" % "jetty-webapp" % "9.4.27.v20200227",
    )
  )

val scalatraVersion = "2.7.0"

val fooAssemblySettings = Seq(
  assemblyJarName in assembly := "demodex.jar",
  test in assembly := {},
  mainClass in assembly := Some("com.example.foobar.Main"),
)

lazy val root = (project in file("."))
  .settings(fooAssemblySettings: _*)
  .settings(
    organization := "com.example",
    name := "foobar",
    version := "0.1-SNAPSHOT",
    scalaVersion := "2.13.1",
    libraryDependencies ++= Seq(
      "com.zaxxer" % "HikariCP" % "3.4.2",
      "org.eclipse.jetty" % "jetty-webapp" % "9.4.27.v20200227",
      "org.postgresql" % "postgresql" % "42.2.12",
      "org.scalatra" %% "scalatra" % scalatraVersion,
    )
  )

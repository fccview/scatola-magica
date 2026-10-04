const SPARK_COUNT = 10;
const FULL_TURN = 360;

const SPARKS = Array.from({ length: SPARK_COUNT }, (_, index) => ({
  angle: (FULL_TURN / SPARK_COUNT) * index,
  delay: (index % 3) * 40,
}));

const SparkBurst = () => (
  <span aria-hidden="true" className="absolute inset-0 pointer-events-none">
    {SPARKS.map((spark) => (
      <span
        key={spark.angle}
        className="fx-spark"
        style={
          {
            "--fx-angle": `${spark.angle}deg`,
            animationDelay: `${spark.delay}ms`,
          } as React.CSSProperties
        }
      />
    ))}
  </span>
);

export default SparkBurst;

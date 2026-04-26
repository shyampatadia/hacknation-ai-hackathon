type TrustBadgeProps = {
  score: number;
};

export function TrustBadge({ score }: TrustBadgeProps) {
  const tone = score >= 75 ? "high" : score >= 55 ? "mid" : "low";

  return (
    <span className="trust-badge" data-tone={tone}>
      {score}
    </span>
  );
}


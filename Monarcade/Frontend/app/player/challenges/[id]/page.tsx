import { notFound } from "next/navigation";
import { ChallengeBriefingScreen } from "@/components/player/challenge-briefing-screen";
import { getChallengeDetails } from "@/lib/challenge-details";

type ChallengeDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ChallengeDetailsPage({ params }: ChallengeDetailsPageProps) {
  const { id } = await params;
  const challenge = await getChallengeDetails(id);

  if (!challenge) {
    notFound();
  }

  return <ChallengeBriefingScreen challenge={challenge} />;
}

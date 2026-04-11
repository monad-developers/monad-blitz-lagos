import { notFound } from "next/navigation";
import { ChallengePlayScreen } from "@/components/player/challenge-play-screen";
import { getChallengeDetails } from "@/lib/challenge-details";

type ChallengePlayPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ChallengePlayPage({ params }: ChallengePlayPageProps) {
  const { id } = await params;
  const challenge = await getChallengeDetails(id);

  if (!challenge) {
    notFound();
  }

  return <ChallengePlayScreen challengeId={challenge.id} />;
}

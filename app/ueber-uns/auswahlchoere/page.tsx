import { promises as fs } from "fs";
import path from "path";
import AuswahlchoereClient from "@/components/AuswahlchoereClient";
import { mockAuswahlchore } from "@/lib/mockData";

async function getImageCount(slug: string): Promise<number> {
  const dirPath = path.join(
    process.cwd(),
    "public",
    "images",
    "auswahlchoere",
    slug
  );

  try {
    const files = await fs.readdir(dirPath);
    const imageFiles = files.filter((file) =>
      /\.(jpg|jpeg|png|webp)$/i.test(file)
    );
    return imageFiles.length;
  } catch {
    return 0;
  }
}

export default async function AuswahlchoerePage() {
  const ensemblesData = mockAuswahlchore;

  const ensemblesWithCounts = await Promise.all(
    ensemblesData.map(async (ensemble) => {
      const imageCount = await getImageCount(ensemble.slug);
      return {
        ...ensemble,
        imageCount: imageCount,
      };
    })
  );
  return <AuswahlchoereClient ensembles={ensemblesWithCounts} />;
}

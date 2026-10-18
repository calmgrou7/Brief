import { Composition } from "remotion";
import { Episode, type EpisodeProps } from "./Episode";

// 같은 틀로 시리즈를 찍어낼 때: --props 로 episode/title/subtitle 만 바꿔서 렌더
export const Root = () => (
  <Composition
    id="Episode"
    component={Episode}
    durationInFrames={150}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{ episode: 1, title: "Remotion", subtitle: "같은 틀로 시리즈 대량 생산" } satisfies EpisodeProps}
  />
);

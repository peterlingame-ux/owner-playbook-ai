import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import MyPredictions from "@/components/MyPredictions";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { MatchDetailData, StatisticItem } from "@/types/footballApi";

const WIDGET_SCRIPT_SRC = "https://widgets.api-sports.io/3.1.0/widgets.js";
const DEFAULT_FOOTBALL_TEAM_ID = "33";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "api-sports-widget": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

type APISportsWidgetElement = HTMLElement & {
  connectedCallback?: () => void;
};

export default function Models() {
  const { t } = useTranslation();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [matchDetail, setMatchDetail] = useState<MatchDetailData | null>(null);
  const [isTeamLoading, setIsTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const sport = "football";

  const configRef = useRef<APISportsWidgetElement | null>(null);
  const gamesRef = useRef<APISportsWidgetElement | null>(null);
  const gameRef = useRef<APISportsWidgetElement | null>(null);
  const teamRef = useRef<APISportsWidgetElement | null>(null);
  const apiKey = import.meta.env.VITE_API_SPORTS_KEY as string | undefined;

  useEffect(() => {
    if (document.querySelector(`script[src="${WIDGET_SCRIPT_SRC}"]`)) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = WIDGET_SCRIPT_SRC;
    script.type = "module";
    script.crossOrigin = "anonymous";
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => {
      console.error("Failed to load API-SPORTS widget script.");
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !apiKey) {
      return;
    }

    const refreshWidget = (widget: APISportsWidgetElement | null) => {
      if (!widget) return;
      widget.innerHTML = "";
      widget.setAttribute("data-sport", sport);
      widget.connectedCallback?.();
    };

    if (configRef.current) {
      configRef.current.setAttribute("data-key", apiKey);
      configRef.current.setAttribute("data-sport", sport);
      configRef.current.connectedCallback?.();
    }

    refreshWidget(gamesRef.current);
    refreshWidget(gameRef.current);
    refreshWidget(teamRef.current);

    window.setTimeout(() => {
      window.document.dispatchEvent(
        new Event("DOMContentLoaded", { bubbles: true, cancelable: true })
      );
    }, 0);
  }, [apiKey, scriptLoaded, sport]);

  useEffect(() => {
    if (!scriptLoaded) {
      return;
    }

    const gamesElement = gamesRef.current;
    if (!gamesElement) {
      return;
    }

    const attributeCandidates = [
      "data-fixture-id",
      "data-game-id",
      "data-fixture",
      "data-id",
      "data-match-id",
    ];

    const extractFixtureId = (element: HTMLElement | null): string | null => {
      let current: HTMLElement | null = element;
      while (current) {
        for (const attribute of attributeCandidates) {
          const value = current.getAttribute(attribute);
          const trimmedValue = value?.trim();
          if (trimmedValue) {
            return trimmedValue;
          }
        }

        const datasetEntries = Object.entries(current.dataset);
        for (const [key, value] of datasetEntries) {
          const trimmedValue = value?.trim();
          if (
            trimmedValue &&
            ["fixture", "game", "match"].some((token) =>
              key.toLowerCase().includes(token)
            )
          ) {
            return trimmedValue;
          }
        }

        current = current.parentElement;
      }

      return null;
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const fixtureId = extractFixtureId(target);
      if (!fixtureId) return;

      setSelectedGameId((prev) => (prev === fixtureId ? prev : fixtureId));
    };

    gamesElement.addEventListener("click", handleClick);

    return () => {
      gamesElement.removeEventListener("click", handleClick);
    };
  }, [scriptLoaded]);

  useEffect(() => {
    if (!scriptLoaded || !selectedGameId) {
      if (!selectedGameId) {
        setMatchDetail(null);
      }
      return;
    }

    const gameElement = gameRef.current;
    if (!gameElement) {
      return;
    }

    gameElement.setAttribute("data-game-id", selectedGameId);
    gameElement.connectedCallback?.();
  }, [scriptLoaded, selectedGameId]);

  useEffect(() => {
    if (!selectedGameId) {
      setMatchDetail(null);
      setTeamError(null);
      return;
    }

    let isCancelled = false;
    const fetchMatchDetail = async () => {
      setIsTeamLoading(true);
      setTeamError(null);
      try {
        const { data, error } = await supabase.functions.invoke<MatchDetailData>("football-match-detail", {
          body: { fixtureId: selectedGameId },
        });

        if (error) {
          throw error;
        }

        if (!isCancelled) {
          setMatchDetail(data);
        }
      } catch (error) {
        console.error("Failed to load match detail:", error);
        if (!isCancelled) {
          setTeamError(
            t("models.teamInfoError", {
              defaultValue: "加载球队信息时出现问题，请稍后重试。",
            })
          );
          setMatchDetail(null);
        }
      } finally {
        if (!isCancelled) {
          setIsTeamLoading(false);
        }
      }
    };

    fetchMatchDetail();

    return () => {
      isCancelled = true;
    };
  }, [selectedGameId, t]);

  const formatStatValue = (value: StatisticItem["value"]) => {
    if (value === null || value === undefined) return "--";
    return typeof value === "number" ? value.toString() : value;
  };

  const renderTeamHighlights = () => {
    if (!selectedGameId) {
      return (
        <p className="text-sm text-muted-foreground text-center py-6">
          {t("models.selectTeamPrompt")}
        </p>
      );
    }

    if (isTeamLoading) {
      return (
        <p className="text-sm text-muted-foreground text-center py-6">
          {t("models.teamInfoLoading", { defaultValue: "正在加载球队信息..." })}
        </p>
      );
    }

    if (teamError) {
      return (
        <p className="text-sm text-destructive text-center py-6">{teamError}</p>
      );
    }

    const fixture = matchDetail?.fixture;
    if (!fixture) {
      return (
        <p className="text-sm text-muted-foreground text-center py-6">
          {t("models.teamInfoEmpty", { defaultValue: "暂无法获取球队信息。" })}
        </p>
      );
    }

    const highlightKeys = [
      {
        key: "Ball Possession",
        label: t("models.statPossession", { defaultValue: "控球率" }),
      },
      {
        key: "Total Shots",
        label: t("models.statTotalShots", { defaultValue: "射门次数" }),
      },
      {
        key: "Shots on Goal",
        label: t("models.statShotsOnGoal", { defaultValue: "射正次数" }),
      },
    ];

    const { teams, goals, league } = fixture;
    const homeStats = matchDetail?.statistics?.find(
      (stat) => stat.team.id === teams.home.id
    );
    const awayStats = matchDetail?.statistics?.find(
      (stat) => stat.team.id === teams.away.id
    );

    const renderStats = (stats: typeof homeStats) =>
      highlightKeys.map(({ key, label }) => {
        const stat = stats?.statistics.find((item) => item.type === key);
        return (
          <div key={key} className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{label}</span>
            <span className="font-medium text-foreground">
              {formatStatValue(stat?.value)}
            </span>
          </div>
        );
      });

    const leagueDescription = [
      league.country,
      league.name,
      league.round,
    ]
      .filter(Boolean)
      .join(" · ");

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-sm text-muted-foreground">{leagueDescription}</div>
          <div className="text-sm font-semibold">
            {t("models.finalScoreLabel", { defaultValue: "全场比分" })}：
            <span className="ml-2">
              {goals.home ?? 0} - {goals.away ?? 0}
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { side: "home" as const, team: teams.home, stats: homeStats },
            { side: "away" as const, team: teams.away, stats: awayStats },
          ].map(({ side, team, stats }) => (
            <div
              key={team.id}
              className="rounded-lg border border-border/60 bg-background/60 p-4 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                {team.logo && (
                  <img
                    src={team.logo}
                    alt={team.name}
                    className="h-10 w-10 shrink-0 object-contain"
                    onError={(event) => {
                      event.currentTarget.style.visibility = "hidden";
                    }}
                  />
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold line-clamp-2">{team.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {side === "home"
                      ? t("models.homeTeamLabel", { defaultValue: "主队" })
                      : t("models.awayTeamLabel", { defaultValue: "客队" })}
                  </p>
                </div>
                {team.winner !== null && (
                  <span className="text-xs font-semibold text-primary">
                    {team.winner
                      ? t("models.teamWinner", { defaultValue: "胜" })
                      : t("models.teamNotWinner", { defaultValue: "未胜" })}
                  </span>
                )}
              </div>
              <div className="space-y-2">{renderStats(stats)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const hasApiKey = Boolean(apiKey);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-2 sm:px-4 py-4 safe-area-padding">
        {!hasApiKey ? (
          <Card className="p-6 bg-muted/40 border-dashed border-muted-foreground/40 text-sm text-muted-foreground">
            {t("models.apiKeyMissing", {
              defaultValue:
                "未检测到 API-Sports 密钥，请在环境变量 VITE_API_SPORTS_KEY 中配置以加载真实数据。",
            })}
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="p-0 bg-card border-border overflow-hidden">
              
              <div className="flex flex-col lg:grid lg:grid-cols-[minmax(360px,520px)_minmax(0,1fr)] gap-4 lg:gap-6 lg:items-stretch">
                <div
                  id="games-list"
                  className="overflow-y-auto px-2 py-4 lg:max-h-[calc(100vh-180px)] w-full lg:max-w-[520px] lg:h-full"
                >
                  <api-sports-widget
                    ref={gamesRef}
                    data-type="games"
                    data-sport={sport}
                    data-theme="dark"
                    data-show-error="true"
                    data-show-logos="true"
                  ></api-sports-widget>
                </div>
                <Card className="p-0 bg-muted/30 border-border overflow-hidden w-full lg:max-w-none lg:h-full flex flex-col">
                  
                  <div
                    id="game-content"
                    className="px-2 py-4 lg:max-h-[calc(100vh-180px)] overflow-y-auto flex-1"
                  >
                    <div className="card-body">
                      <api-sports-widget
                        ref={gameRef}
                        data-type="game"
                        data-sport={sport}
                        data-theme="dark"
                        data-show-error="true"
                        data-game-id={selectedGameId ?? undefined}
                      ></api-sports-widget>
                      {!selectedGameId && (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          {t("models.selectGamePrompt")}
                        </p>
                      )}
                    </div>
                    <div
                      id="team-content"
                      className="border-t border-border/60 px-2 sm:px-4 pb-6"
                    >
                      {renderTeamHighlights()}
                    </div>
                  </div>
                </Card>
              </div>
            </Card>
          </div>
        )}

        <div className="px-2 sm:px-4 pb-20">
          <MyPredictions />
        </div>
      </main>
      {hasApiKey && (
        <api-sports-widget
          ref={configRef}
          data-type="config"
          data-sport={sport}
          data-key={apiKey ?? ""}
          data-lang="en"
          data-theme="dark"
          data-show-error="true"
          data-show-logos="true"
          data-refresh="20"
          data-favorite="true"
          data-player-trophies="true"
          data-player-injuries="true"
          data-team-squad="true"
          data-team-statistics="true"
          data-player-statistics="true"
          data-tab="games"
          data-game-tab="statistics"
          data-target-player="modal"
          data-target-league="#games-list"
          data-target-team="#team-content"
          data-target-game="#game-content .card-body"
        ></api-sports-widget>
      )}
    </div>
  );
}

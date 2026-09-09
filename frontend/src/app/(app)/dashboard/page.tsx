"use client";

import {
  BookMarked,
  Copy,
  Eye,
  GitCommitHorizontal,
  ArrowUpRight,
  MapPin,
  Link2,
  GitFork,
  Globe,
  // `Lock` alone collides with the DOM's Web Locks API type.
  Lock as LockIcon,
  Star,
  UserMinus,
  UserRoundCheck,
  Users,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ContributionHeatmap } from "@/components/dashboard/heatmap";
import { KpiGrid, type Kpi } from "@/components/dashboard/kpi";
import { TopRepos } from "@/components/dashboard/top-repos";
import { LastSynced } from "@/components/shell/topbar";
import { Panel, PanelHeader } from "@/components/ui/card";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { PageHeading, Skeleton } from "@/components/ui/primitives";
import { comma } from "@/lib/format";
import {
  useContributionYear,
  useContributions,
  useFollowerStats,
  useProfile,
  useReposOverview,
} from "@/lib/hooks";

/**
 * Recharts is ~120kB of the dashboard's JavaScript and neither of these charts is
 * visible on first paint — they sit below the KPI rows and the heatmap. Loading
 * them on their own chunk lets the numbers at the top render while the chart code
 * is still arriving. `ssr: false` because Recharts measures the DOM to size itself
 * and has nothing useful to render on the server anyway.
 */
const ContributionsByYear = dynamic(
  () => import("@/components/dashboard/charts").then((m) => m.ContributionsByYear),
  { ssr: false, loading: () => <Skeleton className="mx-6 mb-6 h-64" /> },
);
const LanguageDonut = dynamic(
  () => import("@/components/dashboard/charts").then((m) => m.LanguageDonut),
  { ssr: false, loading: () => <Skeleton className="mx-6 mb-6 h-64" /> },
);

export default function DashboardPage() {
  const profile = useProfile();
  const stats = useFollowerStats();
  const repos = useReposOverview();
  const contrib = useContributions();

  // Default to the most recent year we actually have data for — not `new Date()`,
  // which would 404 in January before the first sync of the year.
  const availableYears = useMemo(
    () => (contrib.data?.years ?? []).map((y) => y.year).sort((a, b) => b - a),
    [contrib.data],
  );
  const [year, setYear] = useState<number | null>(null);
  const activeYear = year ?? availableYears[0];

  const yearData = useContributionYear(activeYear);

  const kpis: Kpi[] = [
    {
      label: "Followers",
      value: stats.data?.total_followers,
      icon: Users,
      tone: "brand",
      sub: "People following you",
    },
    {
      label: "Following",
      value: profile.data?.following,
      icon: UserRoundCheck,
      tone: "brand",
      sub: "Accounts you follow",
    },
    {
      label: "Lost followers",
      value: stats.data?.total_unfollowed_events,
      icon: UserMinus,
      tone: "negative",
      sub: "Unfollowed and not returned",
    },
  ];

  // Kept as its own row of three. Folding these into the audience row made six
  // cards, which wrapped and left "Private repos" orphaned on a line of its own.
  const countKpis: Kpi[] = [
    {
      label: "Repositories",
      value: repos.data?.total_repos,
      icon: BookMarked,
      tone: "brand",
      sub: "Owned by you",
    },
    {
      label: "Public repos",
      value: repos.data?.public_repos,
      icon: Globe,
      tone: "positive",
      sub: "Visible to everyone",
    },
    {
      label: "Private repos",
      value: repos.data?.private_repos,
      icon: LockIcon,
      tone: "negative",
      sub: "Visible only to you",
    },
  ];

  const repoKpis: Kpi[] = [
    {
      label: "Total stars",
      value: repos.data?.total_stars,
      icon: Star,
      tone: "brand",
      sub: repos.data ? `across ${comma(repos.data.total_repos)} repos` : undefined,
    },
    {
      label: "Forks",
      value: repos.data?.total_forks,
      icon: GitFork,
      sub: repos.data ? `${comma(repos.data.total_watchers)} watchers` : undefined,
    },
    {
      label: "Repository views",
      value: repos.data?.total_views,
      icon: Eye,
      // Say what the window actually is — this is accumulated history, not GitHub's 14 days.
      sub: repos.data
        ? `${comma(repos.data.total_views_unique)} unique · ${repos.data.traffic_days_recorded}d recorded`
        : undefined,
    },
    {
      label: "Clones",
      value: repos.data?.total_clones,
      icon: Copy,
      sub: repos.data ? `${comma(repos.data.total_clones_unique)} unique` : undefined,
    },
    {
      label: "Commits",
      value: repos.data?.total_commits,
      icon: GitCommitHorizontal,
      // All-time, with the last-52-weeks figure as context rather than as the headline.
      sub: repos.data
        ? `${comma(repos.data.total_commits_year)} in the last year`
        : undefined,
    },
  ];

  const profileLink = profile.data?.html_url;
  const blog = profile.data?.blog?.trim();

  return (
    <div className="dashboard-canvas relative space-y-8 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-40 right-[-12%] -z-10 h-96 w-96 rounded-full bg-indigo/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-[32rem] left-[-14%] -z-10 h-80 w-80 rounded-full bg-violet/8 blur-3xl" />

      <PageHeading
        title="Overview"
        description="Your audience, repositories and contribution history — all from the last sync."
        action={<LastSynced at={repos.data?.synced_at} />}
      />

      {/* Profile hero: gives the dashboard a clear identity before the analytics begin. */}
      <section className="relative overflow-hidden rounded-panel border border-hairline bg-glass p-6 backdrop-blur-2xl sm:p-7">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(99,102,241,0.16),transparent_34%),radial-gradient(circle_at_60%_100%,rgba(56,189,248,0.08),transparent_28%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            {profile.data ? (
              <img
                src={profile.data.avatar_url}
                alt=""
                className="size-16 shrink-0 rounded-2xl ring-1 ring-white/10 sm:size-20"
              />
            ) : (
              <Skeleton className="size-16 shrink-0 rounded-2xl sm:size-20" />
            )}
            <div className="min-w-0">
              {profile.data ? (
                <>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h2 className="truncate text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                      {profile.data.name || profile.data.login}
                    </h2>
                    <span className="rounded-full border border-indigo-lift/20 bg-indigo/10 px-2 py-0.5 text-[10px] font-medium text-indigo-lift">
                      GitHub profile
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-ink-3">@{profile.data.login}</p>
                  {profile.data.bio && (
                    <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-2">{profile.data.bio}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-ink-3">
                    {profile.data.location && <span className="inline-flex items-center gap-1.5"><MapPin className="size-3" />{profile.data.location}</span>}
                    {blog && <span className="inline-flex max-w-56 items-center gap-1.5 truncate"><Link2 className="size-3 shrink-0" />{blog.replace(/^https?:\/\//, "")}</span>}
                  </div>
                </>
              ) : (
                <div className="space-y-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-3.5 w-28" /></div>
              )}
            </div>
          </div>
          {profileLink && (
            <Button asChild variant="secondary" size="sm" className="self-start gap-2 lg:self-center">
              <a href={profileLink} target="_blank" rel="noopener noreferrer">
                View on GitHub <ArrowUpRight className="size-3.5" />
              </a>
            </Button>
          )}
        </div>
      </section>

      <div className="space-y-3">
        <div className="flex items-end justify-between px-1">
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-lift">Audience</p><p className="mt-1 text-[13px] text-ink-3">How your community is growing</p></div>
        </div>
        <KpiGrid kpis={kpis} loading={stats.isLoading || repos.isLoading} />
      </div>

      <div className="space-y-3">
        <div className="px-1"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-lift">Repositories</p><p className="mt-1 text-[13px] text-ink-3">Your project footprint at a glance</p></div>
        <KpiGrid kpis={countKpis} loading={repos.isLoading} />
      </div>

      {/* Contribution heatmap */}
      <Panel>
        <PanelHeader
          title="Contributions"
          description={
            yearData.data
              ? `${comma(yearData.data.total_contributions)} contributions in ${activeYear}`
              : "Commits, issues, pull requests and reviews"
          }
          action={
            availableYears.length > 0 && (
              <Dropdown>
                <DropdownTrigger asChild>
                  <Button variant="secondary" size="sm">
                    {activeYear ?? "—"}
                  </Button>
                </DropdownTrigger>
                <DropdownContent>
                  {availableYears.map((y) => (
                    <DropdownItem key={y} onSelect={() => setYear(y)} selected={y === activeYear}>
                      {y}
                    </DropdownItem>
                  ))}
                </DropdownContent>
              </Dropdown>
            )
          }
        />
        <ContributionHeatmap
          weeks={yearData.data?.weeks}
          loading={contrib.isLoading || yearData.isLoading}
        />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Contributions by year"
            description="Split by commits, reviews, issues and pull requests"
          />
          <ContributionsByYear years={contrib.data?.years} loading={contrib.isLoading} />
        </Panel>

        <Panel>
          <PanelHeader
            title="Languages"
            description="Share of code across every repository you own"
          />
          <LanguageDonut languages={repos.data?.top_languages} loading={repos.isLoading} />
        </Panel>
      </div>

      <div className="space-y-3">
        <div className="px-1"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-lift">Performance</p><p className="mt-1 text-[13px] text-ink-3">Reach, momentum and engineering activity</p></div>
        <KpiGrid kpis={repoKpis} loading={repos.isLoading} />
      </div>

      <Panel>
        <PanelHeader
          title="Top repositories"
          description="Ranked by stars"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/repositories">View all</Link>
            </Button>
          }
        />
        <TopRepos repos={repos.data?.most_starred} loading={repos.isLoading} />
      </Panel>
    </div>
  );
}

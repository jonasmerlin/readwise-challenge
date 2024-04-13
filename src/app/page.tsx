"use client";

import { Button } from "@/components/ui/button";
import { Pencil1Icon, ReloadIcon, UpdateIcon } from "@radix-ui/react-icons";
import { track } from "@vercel/analytics";

import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { getDayOfYear, getDaysInYear, set, startOfYear } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const fetchDocumentListApi = async (
  token: string,
  updatedAfter: string | null | undefined = null,
  location: string | null | undefined = null
) => {
  let fullData = [];
  let nextPageCursor = null;

  while (true) {
    const queryParams = new URLSearchParams();
    if (nextPageCursor) {
      queryParams.append("pageCursor", nextPageCursor);
    }
    if (updatedAfter) {
      queryParams.append("updatedAfter", updatedAfter);
    }
    if (location) {
      queryParams.append("location", location);
    }
    console.log(
      "Making export api request with params " + queryParams.toString()
    );
    const response = await fetch(
      "https://readwise.io/api/v3/list/?" + queryParams.toString(),
      {
        method: "GET",
        headers: {
          Authorization: `Token ${token}`,
        },
      }
    );
    const responseJson = await response.json();
    fullData.push(...responseJson["results"]);
    nextPageCursor = responseJson["nextPageCursor"];
    if (!nextPageCursor) {
      break;
    }
  }
  return fullData;
};

export default function Home() {
  const [goal, setGoal] = useState(365);
  const [current, setCurrent] = useState(0);

  const [readwiseApiToken, setReadwiseApiToken] = useState("");
  const [readwiseReadTag, setReadwiseReadTag] = useState("2024_READ");

  const [loading, setLoading] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const [settingsFoundInLocalStorage, setSettingsFoundInLocalStorage] =
    useState(false);

  useEffect(() => {
    const storedSettings = localStorage.getItem("readwise-challenge-settings");

    if (storedSettings) {
      const parsedSettings = JSON.parse(storedSettings);

      setGoal(parsedSettings.goal);
      setReadwiseApiToken(parsedSettings.readwiseApiToken);
      setReadwiseReadTag(parsedSettings.readwiseReadTag);
      setCurrent(parsedSettings.numReadArticles);

      setSettingsFoundInLocalStorage(true);
    }
  }, [settingsFoundInLocalStorage]);

  function fetchReadwiseData() {
    setLoading(true);

    fetchDocumentListApi(
      readwiseApiToken,
      startOfYear(new Date()).toISOString(),
      "archive"
    ).then((data) => {
      console.log(data);

      const readwiseReads = data.filter((document) =>
        Object.keys(document.tags).includes(readwiseReadTag.toLocaleLowerCase())
      );

      setCurrent(readwiseReads.length);

      setLoading(false);
      setSettingsOpen(false);
      localStorage.setItem(
        "readwise-challenge-settings",
        JSON.stringify({
          goal,
          readwiseApiToken,
          readwiseReadTag,
          numReadArticles: readwiseReads.length,
        })
      );
      setSettingsFoundInLocalStorage(true);

      // This is a custom event that will be tracked by Vercel Analytics
      // It only says that the settings were saved. None of the data you entered is sent here.
      track("Settings Saved");
    });
  }

  function onSettingsSave() {
    fetchReadwiseData();
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-24 ">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl ">
        Readwise Challenge
      </h1>
      <div className="h-8" />

      <Dialog open={settingsOpen} onOpenChange={() => setSettingsOpen(false)}>
        <DialogContent className="sm:max-w-[425px] lg:max-w-screen-lg overflow-y-scroll max-h-screen">
          <DialogHeader>
            <DialogTitle>Edit settings</DialogTitle>
            <DialogDescription>
              Don&apos;t worry about the API token, the whole app only runs
              locally in your browser. The token is persisted to local storage
              though, so there might be some risk there you should be aware of.
              You can check the source code for this page{" "}
              <a
                className="text-blue-500 underline"
                href="https://github.com/jonasmerlin/readwise-challenge"
              >
                here
              </a>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="goal">Goal</Label>
            <p className="text-sm text-muted-foreground">
              How many articles do you want to read this year?
            </p>
            <Input
              id="goal"
              type="number"
              value={goal}
              onChange={(e) => setGoal(parseInt(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="readwise-api-token">Readwise API Token</Label>
            <p className="text-sm text-muted-foreground">
              Your personal Readwise API token. You can get one{" "}
              <a
                className="text-blue-500 underline"
                href="https://readwise.io/access_token"
              >
                here
              </a>
              .
            </p>
            <Input
              id="readwise-api-token"
              value={readwiseApiToken}
              onChange={(e) => setReadwiseApiToken(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="readwise-read-tag">Tag</Label>
            <p className="text-sm text-muted-foreground">
              The tag you give to articles you read this year. This is
              case-insensitive.
            </p>
            <Input
              id="readwise-read-tag"
              value={readwiseReadTag}
              onChange={(e) => setReadwiseReadTag(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={onSettingsSave}>
              {loading ? (
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bg-stone-100 p-6 rounded border border-1 border-stone-200">
        {settingsFoundInLocalStorage ? (
          <ProgressBar
            goal={goal}
            current={current}
            refreshLoading={loading}
            onRefreshClick={fetchReadwiseData}
            onEditClick={() => setSettingsOpen(true)}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground  w-[256px]">
              It looks like you haven&apos;t set up your challenge in this
              browser yet. Click the button below to get started.
            </p>
            <Button
              onClick={() => setSettingsOpen(true)}
              className="flex flex-row gap-2"
            >
              <span>👊</span> Get started
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

interface ProgressBarProps {
  goal: number;
  current: number;
  refreshLoading: boolean;
  onRefreshClick: () => void;
  onEditClick: () => void;
}

function ProgressBar({
  goal,
  current,
  refreshLoading,
  onRefreshClick,
  onEditClick,
}: ProgressBarProps) {
  const progress = current / goal;

  const width = `${Math.round(progress * 100)}%`;

  const now = new Date();

  const dayOfYear = getDayOfYear(now);
  const articlesPerDay = goal / getDaysInYear(now);

  const articlesUntilToday = Math.round(articlesPerDay * dayOfYear);

  return (
    <>
      <div className="flex flex-col">
        <div className="flex flex-row justify-between">
          <h2 className="scroll-m-20 border-b pb-2 text-base font-semibold tracking-tight first:mt-0 text-stone-500">
            2024
          </h2>
          <div className="flex flex-row gap-2">
            <Button
              className=""
              variant={"outline"}
              size={"icon"}
              onClick={onRefreshClick}
            >
              <UpdateIcon
                className={`h-4 w-4 ${refreshLoading ? "animate-spin" : null}`}
              />
            </Button>
            <Button
              className=""
              variant={"outline"}
              size={"icon"}
              onClick={onEditClick}
            >
              <Pencil1Icon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="h-4" />
        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight font-nums-tabular">
          {current}{" "}
          <span className="text-base text-muted-foreground font-nums-tabular">
            / {goal} ({Math.round((current / goal) * 100)}%)
          </span>
        </h3>
        <small className="text-sm font-medium leading-none">
          articles read
        </small>
      </div>
      <div className="h-3" />
      <div className="bg-stone-100 w-[256px] lg:w-96 h-6 flex items-center rounded-full outline outline-2 outline-stone-900 relative">
        {current < articlesUntilToday ? (
          <div
            className="h-6 rounded-l-full absolute left-0 top-0 pattern-diagonal-lines pattern-red-500 pattern-bg-red-200 pattern-size-1 pattern-opacity-20 z-10"
            style={{
              width: `${Math.round((articlesUntilToday / goal) * 100)}%`,
            }}
          />
        ) : null}
        <div
          className={`${
            current >= articlesUntilToday ? "bg-green-500" : "bg-red-500"
          } h-6 flex items-center rounded-l-full pl-6 z-20`}
          style={{
            width: width,
          }}
        />
      </div>
      <div className="h-3" />
      {current > articlesUntilToday ? (
        <p className="text-sm text-muted-foreground">
          You&apos;re{" "}
          <span className="font-bold text-stone-900">
            {current - articlesUntilToday}
          </span>{" "}
          articles{" "}
          <span className="text-green-500 font-bold">ahead of schedule</span>.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          You&apos;re{" "}
          <span className="font-bold text-stone-900">
            {articlesUntilToday - current}
          </span>{" "}
          articles{" "}
          <span className="text-red-500 font-bold">behind schedule</span>.
        </p>
      )}
    </>
  );
}

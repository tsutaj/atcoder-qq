"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"

const ratedRangeSymbol = "◉"

const ratedRangeIndex: { [key: string]: number } = {
  "-": 0,
  " ~ 1199": 1,
  " ~ 1999": 2,
  " ~ 2799": 3,
  "1200 ~ 2799": 3,
  All: 4,
  "1200 ~ ": 4,
  "2000 ~ ": 4,
}

const ratedRangeColor = [
  "#000000", // black
  "#008000", // green
  "#0000ff", // blue
  "#ff8000", // orange
  "#ff0000", // red
]

const ratedRangeStr = [
  "All Contests",
  "Old-ABC, ABC, ARC, AGC",
  "ABC, ARC, AGC",
  "ARC, AGC",
  "AGC",
]

const TwitterButton = (props: {
  text?: string,
  url?: string,
  hashtags?: string[],
}) => {
  const _url = new URL("https://twitter.com/intent/tweet");
  if (props.text !== undefined) _url.searchParams.set("text", props.text);
  if (props.url !== undefined) _url.searchParams.set("url", props.url);
  if (props.hashtags !== undefined) _url.searchParams.set("hashtags", props.hashtags.join(","));
  return (
    <a href={_url.toString()}
       target="_blank"
       rel="noopener noreferrer"
       className="text-white bg-[#1da1f2] hover:bg-[#1da1f2]/90 focus:ring-4 focus:outline-none focus:ring-[#1da1f2]/50 font-medium rounded-lg text-sm px-4 py-2 text-center inline-flex items-center dark:focus:ring-[#1da1f2]/55 mr-2 mb-2 w-fit">
      <svg className="w-4 h-4 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor"
           viewBox="0 0 20 17">
        <path fill-rule="evenodd"
              d="M20 1.892a8.178 8.178 0 0 1-2.355.635 4.074 4.074 0 0 0 1.8-2.235 8.344 8.344 0 0 1-2.605.98A4.13 4.13 0 0 0 13.85 0a4.068 4.068 0 0 0-4.1 4.038 4 4 0 0 0 .105.919A11.705 11.705 0 0 1 1.4.734a4.006 4.006 0 0 0 1.268 5.392 4.165 4.165 0 0 1-1.859-.5v.05A4.057 4.057 0 0 0 4.1 9.635a4.19 4.19 0 0 1-1.856.07 4.108 4.108 0 0 0 3.831 2.807A8.36 8.36 0 0 1 0 14.184 11.732 11.732 0 0 0 6.291 16 11.502 11.502 0 0 0 17.964 4.5c0-.177 0-.35-.012-.523A8.143 8.143 0 0 0 20 1.892Z"
              clip-rule="evenodd"/>
      </svg>
      Tweet
    </a>
  )
}

const getContestURL = (id: string) => {
  return `https://atcoder.jp/contests/${id}`
}

const getRankingText = (num: number) => {
  const numStr = String(num);

  switch (numStr.slice(-2)) {
    case '11':
    case '12':
    case '13':
      return `${numStr}th`;
    default:
      console.log(numStr, numStr.slice(-1))
      switch (numStr.slice(-1)) {
        case '1':
          return `${numStr}st`;
        case '2':
          return `${numStr}nd`;
        case '3':
          return `${numStr}rd`;
        default:
          return `${numStr}th`;
      }
  }
}

interface Contest {
  id: string
  rate_change: string
  title: string
  start_epoch_second: number
}

interface UserHistory {
  ContestScreenName: string
  Place: number
}

class UserHistoryTable {
  minRank: number[]
  achieveCount: Map<number, Contest[][]>

  constructor(userData: UserHistory[], idToContest: Map<string, Contest>) {
    const numRatedRange = ratedRangeColor.length

    this.minRank = Array(numRatedRange).fill(Infinity)
    this.achieveCount = new Map()

    userData.forEach((userJoining) => {
      const contestId = userJoining.ContestScreenName.split(".")[0]
      const contest = idToContest.get(contestId)
      const rateChange = idToContest.get(contestId)?.rate_change
      const place = userJoining.Place
      if (rateChange) {
        const ratedIdx = ratedRangeIndex[rateChange]
        this.minRank[ratedIdx] = Math.min(this.minRank[ratedIdx], place)
        if (!this.achieveCount.has(place)) {
          this.achieveCount.set(
            place,
            Array.from(new Array(numRatedRange), () => [])
          )
        }
        this.achieveCount.get(place)![ratedIdx].push(contest!)
      }
    })
  }

  public getMinRank = (lbRatedRangeIndex: number): number => {
    return Math.min(...this.minRank.slice(lbRatedRangeIndex))
  }

  public getRoundedMinRank = (lbRatedRangeIndex: number): number => {
    let minRank = this.getMinRank(lbRatedRangeIndex)
    if (minRank == Infinity) {
      return minRank
    } else {
      minRank -= minRank % 100
      return minRank
    }
  }

  public getQQData = (lbRatedRangeIndex: number): number[][] | null => {
    const numRatedRange = ratedRangeColor.length

    // 絞った結果 1 件も存在しない場合がある
    let minRank = this.getRoundedMinRank(lbRatedRangeIndex)
    if (minRank == Infinity) return null

    let qqData = Array.from(new Array(100), () =>
      new Array(numRatedRange).fill(0)
    )
    for (let rank = minRank; rank < minRank + 100; rank++) {
      if (!this.achieveCount.has(rank)) continue
      for (let i = lbRatedRangeIndex; i < numRatedRange; i++) {
        qqData[rank - minRank][i] = this.achieveCount.get(rank)![i].length
      }
    }
    return qqData
  }

  public getDetails = (lbRatedRangeIndex: number, rank: number): Contest[] => {
    const numRatedRange = ratedRangeColor.length

    if (!this.achieveCount.has(rank)) return []
    let details = []
    for (let i = lbRatedRangeIndex; i < numRatedRange; i++) {
      details.push(...this.achieveCount.get(rank)![i])
    }
    details.sort((a: Contest, b: Contest) => a.start_epoch_second - b.start_epoch_second)
    return details
  }
}

const getContestInfo = (): Promise<Map<string, Contest>> => {
  return new Promise((resolve, reject) => {
    fetch("/contests")
      .then((response) => response.json())
      .then((data) => {
        let contestMap = new Map()
        data.forEach((e: Contest) => contestMap.set(e.id, e))
        resolve(contestMap)
      })
      .catch((error) => reject(error))
  })
}

const getUserData = (userId: string): Promise<UserHistory[]> => {
  return new Promise((resolve, reject) => {
    if (userId.length === 0) {
      reject("userId is empty")
    }
    fetch(`/users/${userId}`)
      .then((response) => response.json())
      .then((data) => resolve(data))
      .catch((error) => reject(error))
  })
}

const AtCoderUserForm = (props: {
  setUserId: (userId: string) => void
  setLbRatedRangeIndex: (lbRatedRangeIndex: number) => void
}) => {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const form = e.currentTarget
    const formData = new FormData(form)
    const userId = formData.get("atcoder-id")! as string
    const lbRatedRangeIndex = parseInt(formData.get("lb-rated-range-index")! as string)
    props.setUserId(userId)
    props.setLbRatedRangeIndex(lbRatedRangeIndex)
    history.pushState("", "", `?user=${userId}&rated-range=${lbRatedRangeIndex}`);
  }

  return (
    <form method="get" onSubmit={handleSubmit}>
      <div className="mx-auto max-w-2xl sm:flex sm:space-x-3 p-3 bg-white border rounded-lg shadow-lg shadow-gray-100 dark:bg-slate-900 dark:border-gray-700 dark:shadow-gray-900/[.2]">
        <div className="pb-2 sm:pb-0 sm:flex-[2_0_0%]">
          <label htmlFor="atcoder-id" className="block text-sm font-medium dark:text-white"><span className="sr-only">AtCoder ID</span></label>
          <input type="text" id="atcoder-id" className="py-3 px-4 block w-full border-transparent rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 sm:p-4 dark:bg-slate-900 dark:border-transparent dark:text-gray-400" placeholder="AtCoder ID" name="atcoder-id"/>
        </div>
        <div className="pt-2 sm:pt-0 sm:pl-3 border-t border-gray-200 sm:border-t-0 sm:border-l sm:flex-[3_0_0%] dark:border-gray-700">
          <label htmlFor="lb-rated-range-index" className="block text-sm font-medium dark:text-white"><span className="sr-only">Rated Range Index</span></label>
          <select name="lb-rated-range-index" id="lb-rated-range-index" defaultValue="2" className="bg-white py-3 px-4 block w-full border-transparent rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 sm:p-4 dark:bg-slate-900 dark:border-transparent dark:text-gray-400">
            <option value="0">UnRated を含むすべてのコンテスト</option>
            <option value="1">Rated 上限が 1199 以上のコンテスト</option>
            <option value="2">Rated 上限が 1999 以上のコンテスト</option>
            <option value="3">Rated 上限が 2799 以上のコンテスト</option>
            <option value="4">Rated 上限がないコンテストのみ</option>
          </select>
        </div>
        <div className="pt-2 sm:pt-0 grid sm:block sm:flex-[0_0_auto]">
          <button type="submit" className="py-3 px-4 inline-flex justify-center items-center gap-2 rounded-md border border-transparent font-semibold bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all text-sm sm:p-4 dark:focus:ring-offset-gray-800">
            Create QQ
          </button>
        </div>
      </div>
    </form>
  )
}

const QQTableCell = (props: { qqData: number[] }) => {
  return (
    <ul>
      {props.qqData.map((num, idx) => {
        if (num === 0) {
          return ""
        } else {
          return (
            <li key={`elem-${idx}`}>
              <span style={{ color: `${ratedRangeColor[idx]}` }}>
                {ratedRangeSymbol}
              </span>
              x {num}
            </li>
          )
        }
      })}
    </ul>
  )
}

const Details = (props: {
  rank: number | undefined
  contests: Contest[] | undefined
}) => {
  if (props.contests === undefined || props.contests.length === 0) return <></>
  return (
    <div className="space-y-2 sm:space-y-4">
      <h2 className="text-xl text-gray-800 font-bold sm:text-3xl lg:text-4xl lg:leading-tight dark:text-gray-200">
        {getRankingText(props.rank!)}
      </h2>
      <div className="overflow-x-auto border rounded-lg overflow-hidden dark:border-gray-700">
        <table className="table-auto w-full bg-white border text-left text-sm font-light dark:bg-slate-900 dark:border-gray-700">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <th scope="col" className="px-6 py-3">
              Date
            </th>
            <th scope="col" className="px-6 py-3">
              Contest Name
            </th>
          </tr>
          </thead>
          <tbody>
            {props.contests.map((contest, index) => {
              let dateTime = new Date(contest.start_epoch_second * 1000)
              let dateString = dateTime.toLocaleDateString(
                "ja-JP", {year: "numeric",month: "2-digit", day: "2-digit"}
              )
              return (
                <tr key={`detail=${index}`} className="bg-white hover:bg-slate-100 hover:dark:bg-slate-800 border-b dark:bg-gray-900 dark:border-gray-700">
                  <td className="px-6 py-4">
                    {dateString}
                  </td>
                  <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                    <span style={{ color: `${ratedRangeColor[ratedRangeIndex[contest.rate_change]]}` }}>
                      {ratedRangeSymbol}
                    </span>
                    <a href={getContestURL(contest.id)}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                    >{contest.title}</a>
                  </th>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const QQTable = (props: {
  userId: string
  lbRatedRangeIndex: number
  contestInfo: Map<string, Contest>
}) => {
  const [userHistoryTable, setUserHistoryTable] = useState<UserHistoryTable>()
  const [details, setDetails] = useState<Contest[]>([])
  const [rank, setRank] = useState<number>()
  useEffect(() => {
    getUserData(props.userId).then((data) =>
      setUserHistoryTable(new UserHistoryTable(data, props.contestInfo))
    )
    setDetails([])
  }, [props.contestInfo, props.userId])

  if (props.userId.length === 0) {
    return <></>
  }

  const qqData = userHistoryTable?.getQQData(props.lbRatedRangeIndex)
  if (userHistoryTable === undefined) {
    return <div>Loading...</div>
  } else if (!qqData) {
    return (
      <div className="bg-orange-100 text-orange-700 p-4 rounded-lg" role="alert">
        <p>{props.userId}{" "} というユーザーが存在しないか、指定された範囲のコンテストに参加したことがありません</p>
      </div>
    )
  } else {
    const minRank = userHistoryTable.getRoundedMinRank(props.lbRatedRangeIndex)
    const range = [...Array(10).keys()] // [0, 1, ..., 9]
    return <>
      <div className="space-y-1">
        <div className="overflow-x-auto border rounded-lg overflow-hidden dark:border-gray-700">
          <table className="table-auto w-full bg-white border text-center text-sm font-light dark:bg-slate-900 dark:border-gray-700">
            <thead>
              <tr>
                <th className="border p-1 dark:border-neutral-500 whitespace-nowrap"></th>
                {range.map((val) => (
                  <th key={`head-cell-${val}`} className="border p-1 dark:border-neutral-500 font-bold whitespace-nowrap">{val}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {range.map((rowval) => {
                let lb = minRank + rowval * 10
                return (
                  <tr key={`body-row-${rowval}`}>
                    <td key={`row-${rowval}`} className="border p-1 dark:border-neutral-500 font-bold whitespace-nowrap">{lb}〜</td>
                    {range.map((colval) => {
                      const rank = minRank + rowval * 10 + colval
                      if (rank === 0) {
                        return <td key="rank-none" className="border p-1 hover:cursor-pointer hover:bg-slate-300 hover:dark:bg-slate-600 dark:border-neutral-500 whitespace-nowrap">-</td>
                      } else {
                        let rankDetails = userHistoryTable.getDetails(props.lbRatedRangeIndex, rank)
                        return (
                          <td key={`rank-${rank}`} onClick={() => {setDetails(rankDetails); setRank(rank)}} className="border p-1 hover:cursor-pointer hover:bg-slate-300 hover:dark:bg-slate-600 dark:border-neutral-500 whitespace-nowrap">
                            <QQTableCell qqData={qqData[rowval * 10 + colval]}/>
                          </td>
                        )
                      }
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <TwitterButton
          text={`${props.userId}'s AtCoder QQ (${ratedRangeStr[props.lbRatedRangeIndex]})`}
          url={location.href}
          hashtags={["AtCoderQQ"]} />
      </div>
      <Details rank={rank} contests={details} />
    </>
  }
}

const AtCoderQQ = () => {
  let [userId, setUserId] = useState("")
  let [lbRatedRangeIndex, setLbRatedRangeIndex] = useState(0)
  let [contestInfo, setContestInfo] = useState<Map<string, Contest>>(new Map())
  useMemo(() => {
    getContestInfo()
      .then((data) => setContestInfo(data))
      .catch((_) => new Map())
  }, [])
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search)
    if (queryParams.has("user") && queryParams.has("rated-range")) {
      setUserId(queryParams.get("user")!)
      setLbRatedRangeIndex(parseInt(queryParams.get("rated-range")!))
    }
  }, [])

  if (contestInfo.size === 0) {
    return <div>Loading...</div>
  } else {
    return (
      <>
        <AtCoderUserForm
          setUserId={setUserId}
          setLbRatedRangeIndex={setLbRatedRangeIndex}
        />
        <QQTable
          userId={userId}
          lbRatedRangeIndex={lbRatedRangeIndex}
          contestInfo={contestInfo}
        />
      </>
    )
  }
}

export default function Home() {
  useEffect(() => {
    // @ts-ignore
    import('preline');
  }, []);

  return (
    <main className="flex min-h-screen flex-col justify-start font-sans">
      <div className="overflow-hidden">
        <div className="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="relative mx-auto max-w-4xl grid space-y-5 sm:space-y-10">
            {/* Title */}
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-500 tracking-wide uppercase mb-3 dark:text-gray-200">
                Create QQ Table from your great contest results
              </p>
              <h1 className="text-3xl text-gray-800 font-bold sm:text-5xl lg:text-6xl lg:leading-tight dark:text-gray-200">
                AtCoder QQ
              </h1>
            </div>
            {/* End Title */}
            <AtCoderQQ />
          </div>
        </div>
      </div>
    </main>
  )
}

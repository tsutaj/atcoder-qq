'use client'

import { FormEvent, useEffect, useMemo, useState } from "react";

const ratedRangeSymbol = "◉"

const ratedRangeIndex: { [key: string]: number } = {
    "-"           : 0,
    " ~ 1199"     : 1,
    " ~ 1999"     : 2,
    " ~ 2799"     : 3,
    "1200 ~ 2799" : 3,
    "All"         : 4,
    "1200 ~ "     : 4,
    "2000 ~ "     : 4,
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

interface Contest {
  id: string,
  rate_change: string,
}

interface UserHistory {
  ContestScreenName: string,
  Place: number,
}

class QQData {
  minRank: number[]
  achieveCount: Map<number, string[][]>

  constructor(userData: UserHistory[], contestInfo: Map<string, string>) {
    const numRatedRange = ratedRangeColor.length

    this.minRank = Array(numRatedRange).fill(Infinity)
    this.achieveCount = new Map()

    // userHistory は 1 行以上あると仮定して良い
    userData.forEach(userJoining => {
        const contestId = userJoining.ContestScreenName.split('.')[0]
        const rateChange = contestInfo.get(contestId)
        const place = userJoining.Place
        if (rateChange) {
          const ratedIdx = ratedRangeIndex[rateChange]
          this.minRank[ratedIdx] = Math.min(this.minRank[ratedIdx], place)
          if (!this.achieveCount.has(place)) {
            this.achieveCount.set(place, Array.from(new Array(numRatedRange), () => new Array()))
          }
          this.achieveCount.get(place)![ratedIdx].push(contestId)
        }
    })
  }

  public getMinRank = (lbRatedRangeIndex: number): number => {
    return Math.min(...this.minRank.slice(lbRatedRangeIndex))
  }

  public getData = (lbRatedRangeIndex: number): (number[][] | null) => {
    const numRatedRange = ratedRangeColor.length
    let minRank = this.getMinRank(lbRatedRangeIndex)

    // 絞った結果 1 件も存在しない場合がある
    if (minRank == Infinity) return null

    // minRank の下二桁は捨てる
    minRank -= minRank % 100
    let qqData = Array.from(new Array(100), () => new Array(numRatedRange).fill(0))
    for(let rank=minRank; rank<minRank+100; rank++) {
      if(!this.achieveCount.has(rank)) continue
      for(let i=lbRatedRangeIndex; i<numRatedRange; i++) {
        qqData[rank - minRank][i] = this.achieveCount.get(rank)![i].length
      }
    }
    return qqData
  }
}

const getContestInfo = (): Promise<Map<string, string>> => {
  return new Promise((resolve, reject) => {
    fetch("/contests")
    .then(response => response.json())
    .then(data => {
      let contestMap = new Map()
      data.forEach((e: Contest) => contestMap.set(e.id, e.rate_change))
      resolve(contestMap)
    })
    .catch(error => reject(error))
  })
}

const getUserData = (userId: string): Promise<UserHistory[]> => {
  return new Promise((resolve, reject) => {
    fetch(`/users/${userId}`)
    .then(response => response.json())
    .then(data => resolve(data))
    .catch(error => reject(error))
  })
}

const AtCoderUserForm = (props: {
  setUserId: (userId: string) => void,
  setLbRatedRangeIndex: (lbRatedRangeIndex: number) => void
}) => {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);
    props.setUserId(formData.get("atcoder-id")! as string)
    props.setLbRatedRangeIndex(parseInt(formData.get("lb-rated-range-index")! as string))
  }

  return (
    <form method="get" onSubmit={handleSubmit}>
      <input
        className="border-slate-200 placeholder-slate-400 contrast-more:border-slate-400 contrast-more:placeholder-slate-500"
        placeholder="AtCoder ID"
        name="atcoder-id"
        type="text" />
      <select name="lb-rated-range-index" defaultValue="2">
        <option value="0">UnRated を含むすべてのコンテスト</option>
        <option value="1">Rated 上限が 1199 以上のコンテスト</option>
        <option value="2">Rated 上限が 1999 以上のコンテスト</option>
        <option value="3">Rated 上限が 2799 以上のコンテスト</option>
        <option value="4">Rated 上限がないコンテストのみ</option>
      </select>
      <button type="submit">Submit</button>
    </form>
  )
}

const QQTableCell = (props: {qqData: number[]}) => {
  return (
    <ul>
      { props.qqData.map((num, idx) => {
          if (num === 0) {
            return ""
          } else {
            return (
              <li key={`elem-${idx}`}>
                <span style={{color: `${ratedRangeColor[idx]}`}}>{ratedRangeSymbol}</span>
                x {num}
              </li>
            )
          }
        })
      }
    </ul>
  )
}

const QQTable = (props: {userId: string, lbRatedRangeIndex: number, contestInfo: Map<string, string>}) => {
  const [userData, setData] = useState<QQData | null>(null)
  useEffect(() => {
    getUserData(props.userId)
    .then(data => setData(new QQData(data, props.contestInfo)))
    .catch(_ => setData(null))
  }, [props.contestInfo, props.userId])

  console.log("QQTable", userData)
  if (props.userId.length === 0) {
    return <></>
  }

  const qqData = userData?.getData(props.lbRatedRangeIndex)
  if (userData === null) {
    return <div className="font-sans">
      {props.userId} というユーザーが存在しないか、データの取得に失敗しています
    </div>
  } else if (!qqData) {
    return <div className="font-sans">
      {props.userId} はコンテストに参加したことがありません
    </div>
  } else {
    let minRank = userData.getMinRank(props.lbRatedRangeIndex)
    minRank -= minRank % 100
    const range = [...Array(10).keys()] // [0, 1, ..., 9]
    return (
      <table>
        <thead>
          <tr>
            <td></td>
            { range.map(val => <td key={`head-cell-${val}`}>{val}</td>) }
          </tr>
        </thead>
        <tbody>
          {
            range.map(rowval => {
              let lb = minRank + rowval * 10
              let ub = lb + 9
              return (
                <tr key={`body-row-${rowval}`}>
                  <td key={`row-${rowval}`}>{lb}〜{ub}</td>
                  {
                    range.map(colval => {
                      const rank = minRank + rowval*10 + colval
                      if (rank === 0) {
                        return <td key="rank-none">-</td>
                      } else {
                        return (
                          <td key={`rank-${rank}`}>
                            <QQTableCell qqData={qqData[rowval * 10 + colval]} />
                          </td>
                        )
                      }
                    })
                  }
                </tr>
              )
            })
          }
        </tbody>
      </table>
    )
  }
}

const AtCoderQQ = () => {
  let [userId, setUserId] = useState('')
  let [lbRatedRangeIndex, setLbRatedRangeIndex] = useState(0)
  let [contestInfo, setContestInfo] = useState<Map<string, string> | null>(new Map())
  useMemo(() => {
    getContestInfo()
    .then(data => setContestInfo(data))
    .catch(_ => setContestInfo(null))
  }, [])

  console.log("AtCoderQQ", contestInfo)
  if (contestInfo === null) {
    return <div>コンテスト情報が読み込めません</div>
  } else if(contestInfo.size === 0) {
    return <div>Loading...</div>
  } else {
    return (
      <>
        <AtCoderUserForm setUserId={setUserId} setLbRatedRangeIndex={setLbRatedRangeIndex} />
        <QQTable userId={userId} lbRatedRangeIndex={lbRatedRangeIndex} contestInfo={contestInfo} />
      </>
    )
  }
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col justify-start p-24">
      <h1 className="text-3xl">AtCoder QQ</h1>
      <AtCoderQQ />
    </main>
  )
}
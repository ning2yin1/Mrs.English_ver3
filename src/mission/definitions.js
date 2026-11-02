// Exact definitions from docs/mission_definitions.json.
export const DEFINITIONS = {
  "schemaVersion": 1,
  "timeZone": "Asia/Tokyo",
  "daily": [
    {
      "id": "D01",
      "name": "今日の英語学習",
      "condition": "ステージを1回クリア",
      "metric": "stage_clear",
      "target": 1,
      "reward": {
        "currency": "r_coin",
        "amount": 200
      }
    },
    {
      "id": "D02",
      "name": "正解を積み重ねよう",
      "condition": "15問正解",
      "metric": "correct_answers",
      "target": 15,
      "reward": {
        "currency": "r_coin",
        "amount": 300
      }
    },
    {
      "id": "D03",
      "name": "コンボに挑戦",
      "condition": "5コンボ達成",
      "metric": "true_correct_streak_max",
      "target": 5,
      "reward": {
        "currency": "r_coin",
        "amount": 300
      }
    },
    {
      "id": "D04",
      "name": "文法を幅広く学ぼう",
      "condition": "異なる文法を2種類クリア",
      "metric": "distinct_grammar_clear",
      "target": 2,
      "reward": {
        "currency": "r_coin",
        "amount": 300
      }
    },
    {
      "id": "D05",
      "name": "難易度アップ！",
      "condition": "NORMAL以上を1回クリア",
      "metric": "normal_or_hard_clear",
      "target": 1,
      "reward": {
        "currency": "r_coin",
        "amount": 400
      }
    },
    {
      "id": "D06",
      "name": "デイリー完全達成",
      "condition": "D01〜D05をすべて達成",
      "metric": "base_missions_completed",
      "target": 5,
      "reward": {
        "currency": "diamond",
        "amount": 5
      }
    }
  ],
  "weekly": [
    {
      "id": "W01",
      "name": "今週の学習目標",
      "condition": "ステージを15回クリア",
      "metric": "stage_clear",
      "target": 15,
      "reward": {
        "currency": "r_coin",
        "amount": 1000
      }
    },
    {
      "id": "W02",
      "name": "HARDに挑戦",
      "condition": "HARDを3回クリア",
      "metric": "hard_clear",
      "target": 3,
      "reward": {
        "currency": "r_coin",
        "amount": 1500
      }
    },
    {
      "id": "W03",
      "name": "文法マスター",
      "condition": "異なる文法を10種類クリア",
      "metric": "distinct_grammar_clear",
      "target": 10,
      "reward": {
        "currency": "r_coin",
        "amount": 1500
      }
    },
    {
      "id": "W04",
      "name": "パーフェクトを目指そう",
      "condition": "全問正解で3ステージクリア",
      "metric": "perfect_stage_clear",
      "target": 3,
      "reward": {
        "currency": "r_coin",
        "amount": 2000
      }
    },
    {
      "id": "W05",
      "name": "カードを育てよう",
      "condition": "カードを3回強化",
      "metric": "successful_upgrade",
      "target": 3,
      "reward": {
        "currency": "r_coin",
        "amount": 1000
      }
    },
    {
      "id": "W06",
      "name": "ウィークリー完全達成",
      "condition": "W01〜W05をすべて達成",
      "metric": "base_missions_completed",
      "target": 5,
      "reward": {
        "currency": "diamond",
        "amount": 20
      }
    }
  ]
};

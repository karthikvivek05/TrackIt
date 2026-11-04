#!/usr/bin/env python3
"""Convert the Striver A2Z text mapping into server/data/a2z.json."""
import json
import re
import os

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "server", "data", "source", "striver.txt")
if not os.path.exists(SRC):
    SRC = os.path.expanduser("~/Downloads/striver_a2z_dsa_sheet_complete_leetcode_question_mapping.txt")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "server", "data", "a2z.json")

STEP_SLUGS = {
    1: "learn-the-basics",
    2: "sorting",
    3: "arrays",
    4: "binary-search",
    5: "strings",
    6: "linked-list",
    7: "recursion",
    8: "bit-manipulation",
    9: "stack-queues",
    10: "sliding-window-two-pointer",
    11: "heaps",
    12: "greedy",
    13: "binary-trees",
    14: "bst",
    15: "graphs",
    16: "dp",
    17: "tries",
    18: "strings-advanced",
}

STEP_TITLES = {
    1: "Learn the Basics",
    2: "Sorting",
    3: "Arrays",
    4: "Binary Search",
    5: "Strings",
    6: "Linked List",
    7: "Recursion",
    8: "Bit Manipulation",
    9: "Stack and Queues",
    10: "Sliding Window & Two Pointer",
    11: "Heaps",
    12: "Greedy",
    13: "Binary Trees",
    14: "Binary Search Trees",
    15: "Graphs",
    16: "Dynamic Programming",
    17: "Tries",
    18: "Advanced Strings",
}

# LeetCode number -> (official slug, difficulty). Free (non-premium) problems only.
LC = {
    1: ("two-sum", "Easy"),
    2: ("add-two-numbers", "Medium"),
    3: ("longest-substring-without-repeating-characters", "Medium"),
    4: ("median-of-two-sorted-arrays", "Hard"),
    5: ("longest-palindromic-substring", "Medium"),
    7: ("reverse-integer", "Easy"),
    8: ("string-to-integer-atoi", "Medium"),
    9: ("palindrome-number", "Easy"),
    12: ("integer-to-roman", "Medium"),
    13: ("roman-to-integer", "Easy"),
    14: ("longest-common-prefix", "Easy"),
    15: ("3sum", "Medium"),
    17: ("letter-combinations-of-a-phone-number", "Medium"),
    18: ("4sum", "Medium"),
    19: ("remove-nth-node-from-end-of-list", "Medium"),
    20: ("valid-parentheses", "Easy"),
    22: ("generate-parentheses", "Medium"),
    23: ("merge-k-sorted-lists", "Hard"),
    25: ("reverse-nodes-in-k-group", "Hard"),
    26: ("remove-duplicates-from-sorted-array", "Easy"),
    28: ("find-the-index-of-the-first-occurrence-in-a-string", "Easy"),
    29: ("divide-two-integers", "Medium"),
    31: ("next-permutation", "Medium"),
    33: ("search-in-rotated-sorted-array", "Medium"),
    34: ("find-first-and-last-position-of-element-in-sorted-array", "Medium"),
    35: ("search-insert-position", "Easy"),
    37: ("sudoku-solver", "Hard"),
    39: ("combination-sum", "Medium"),
    40: ("combination-sum-ii", "Medium"),
    42: ("trapping-rain-water", "Hard"),
    44: ("wildcard-matching", "Hard"),
    45: ("jump-game-ii", "Medium"),
    48: ("rotate-image", "Medium"),
    50: ("powx-n", "Medium"),
    51: ("n-queens", "Hard"),
    53: ("maximum-subarray", "Medium"),
    54: ("spiral-matrix", "Medium"),
    55: ("jump-game", "Medium"),
    56: ("merge-intervals", "Medium"),
    57: ("insert-interval", "Medium"),
    61: ("rotate-list", "Medium"),
    62: ("unique-paths", "Medium"),
    63: ("unique-paths-ii", "Medium"),
    64: ("minimum-path-sum", "Medium"),
    69: ("sqrtx", "Easy"),
    70: ("climbing-stairs", "Easy"),
    72: ("edit-distance", "Medium"),
    73: ("set-matrix-zeroes", "Medium"),
    74: ("search-a-2d-matrix", "Medium"),
    75: ("sort-colors", "Medium"),
    76: ("minimum-window-substring", "Hard"),
    78: ("subsets", "Medium"),
    79: ("word-search", "Medium"),
    81: ("search-in-rotated-sorted-array-ii", "Medium"),
    84: ("largest-rectangle-in-histogram", "Hard"),
    85: ("maximal-rectangle", "Hard"),
    88: ("merge-sorted-array", "Easy"),
    90: ("subsets-ii", "Medium"),
    94: ("binary-tree-inorder-traversal", "Easy"),
    98: ("validate-binary-search-tree", "Medium"),
    99: ("recover-binary-search-tree", "Medium"),
    100: ("same-tree", "Easy"),
    101: ("symmetric-tree", "Easy"),
    102: ("binary-tree-level-order-traversal", "Medium"),
    103: ("binary-tree-zigzag-level-order-traversal", "Medium"),
    104: ("maximum-depth-of-binary-tree", "Easy"),
    105: ("construct-binary-tree-from-preorder-and-inorder-traversal", "Medium"),
    106: ("construct-binary-tree-from-inorder-and-postorder-traversal", "Medium"),
    110: ("balanced-binary-tree", "Easy"),
    114: ("flatten-binary-tree-to-linked-list", "Medium"),
    115: ("distinct-subsequences", "Hard"),
    118: ("pascals-triangle", "Easy"),
    120: ("triangle", "Medium"),
    121: ("best-time-to-buy-and-sell-stock", "Easy"),
    122: ("best-time-to-buy-and-sell-stock-ii", "Medium"),
    123: ("best-time-to-buy-and-sell-stock-iii", "Hard"),
    124: ("binary-tree-maximum-path-sum", "Hard"),
    125: ("valid-palindrome", "Easy"),
    126: ("word-ladder-ii", "Hard"),
    127: ("word-ladder", "Hard"),
    128: ("longest-consecutive-sequence", "Medium"),
    130: ("surrounded-regions", "Medium"),
    131: ("palindrome-partitioning", "Medium"),
    132: ("palindrome-partitioning-ii", "Hard"),
    135: ("candy", "Hard"),
    136: ("single-number", "Easy"),
    137: ("single-number-ii", "Medium"),
    138: ("copy-list-with-random-pointer", "Medium"),
    139: ("word-break", "Medium"),
    141: ("linked-list-cycle", "Easy"),
    142: ("linked-list-cycle-ii", "Medium"),
    144: ("binary-tree-preorder-traversal", "Easy"),
    145: ("binary-tree-postorder-traversal", "Easy"),
    146: ("lru-cache", "Medium"),
    148: ("sort-list", "Medium"),
    151: ("reverse-words-in-a-string", "Medium"),
    152: ("maximum-product-subarray", "Medium"),
    153: ("find-minimum-in-rotated-sorted-array", "Medium"),
    155: ("min-stack", "Medium"),
    160: ("intersection-of-two-linked-lists", "Easy"),
    162: ("find-peak-element", "Medium"),
    169: ("majority-element", "Easy"),
    173: ("binary-search-tree-iterator", "Medium"),
    188: ("best-time-to-buy-and-sell-stock-iv", "Hard"),
    189: ("rotate-array", "Medium"),
    191: ("number-of-1-bits", "Easy"),
    198: ("house-robber", "Medium"),
    199: ("binary-tree-right-side-view", "Medium"),
    205: ("isomorphic-strings", "Easy"),
    206: ("reverse-linked-list", "Easy"),
    207: ("course-schedule", "Medium"),
    208: ("implement-trie-prefix-tree", "Medium"),
    210: ("course-schedule-ii", "Medium"),
    213: ("house-robber-ii", "Medium"),
    214: ("shortest-palindrome", "Hard"),
    215: ("kth-largest-element-in-an-array", "Medium"),
    216: ("combination-sum-iii", "Medium"),
    222: ("count-complete-tree-nodes", "Easy"),
    225: ("implement-stack-using-queues", "Easy"),
    229: ("majority-element-ii", "Medium"),
    230: ("kth-smallest-element-in-a-bst", "Medium"),
    231: ("power-of-two", "Easy"),
    232: ("implement-queue-using-stacks", "Easy"),
    234: ("palindrome-linked-list", "Easy"),
    235: ("lowest-common-ancestor-of-a-binary-search-tree", "Medium"),
    236: ("lowest-common-ancestor-of-a-binary-tree", "Medium"),
    239: ("sliding-window-maximum", "Hard"),
    240: ("search-a-2d-matrix-ii", "Medium"),
    242: ("valid-anagram", "Easy"),
    260: ("single-number-iii", "Medium"),
    268: ("missing-number", "Easy"),
    282: ("expression-add-operators", "Hard"),
    283: ("move-zeroes", "Easy"),
    295: ("find-median-from-data-stream", "Hard"),
    297: ("serialize-and-deserialize-binary-tree", "Hard"),
    300: ("longest-increasing-subsequence", "Medium"),
    309: ("best-time-to-buy-and-sell-stock-with-cooldown", "Medium"),
    312: ("burst-balloons", "Hard"),
    322: ("coin-change", "Medium"),
    328: ("odd-even-linked-list", "Medium"),
    344: ("reverse-string", "Easy"),
    347: ("top-k-frequent-elements", "Medium"),
    355: ("design-twitter", "Medium"),
    368: ("largest-divisible-subset", "Medium"),
    402: ("remove-k-digits", "Medium"),
    410: ("split-array-largest-sum", "Hard"),
    416: ("partition-equal-subset-sum", "Medium"),
    421: ("maximum-xor-of-two-numbers-in-an-array", "Medium"),
    424: ("longest-repeating-character-replacement", "Medium"),
    485: ("max-consecutive-ones", "Easy"),
    430: ("flatten-a-multilevel-doubly-linked-list", "Medium"),
    435: ("non-overlapping-intervals", "Medium"),
    450: ("delete-node-in-a-bst", "Medium"),
    451: ("sort-characters-by-frequency", "Medium"),
    455: ("assign-cookies", "Easy"),
    460: ("lfu-cache", "Hard"),
    493: ("reverse-pairs", "Hard"),
    494: ("target-sum", "Medium"),
    496: ("next-greater-element-i", "Easy"),
    503: ("next-greater-element-ii", "Medium"),
    509: ("fibonacci-number", "Easy"),
    516: ("longest-palindromic-subsequence", "Medium"),
    518: ("coin-change-ii", "Medium"),
    540: ("single-element-in-a-sorted-array", "Medium"),
    542: ("01-matrix", "Medium"),
    543: ("diameter-of-binary-tree", "Easy"),
    547: ("number-of-provinces", "Medium"),
    560: ("subarray-sum-equals-k", "Medium"),
    583: ("delete-operation-for-two-strings", "Medium"),
    621: ("task-scheduler", "Medium"),
    653: ("two-sum-iv-input-is-a-bst", "Easy"),
    662: ("maximum-width-of-binary-tree", "Medium"),
    673: ("number-of-longest-increasing-subsequence", "Medium"),
    678: ("valid-parenthesis-string", "Medium"),
    686: ("repeated-string-match", "Medium"),
    692: ("top-k-frequent-words", "Medium"),
    700: ("search-in-a-binary-search-tree", "Easy"),
    701: ("insert-into-a-binary-search-tree", "Medium"),
    704: ("binary-search", "Easy"),
    714: ("best-time-to-buy-and-sell-stock-with-transaction-fee", "Medium"),
    721: ("accounts-merge", "Medium"),
    733: ("flood-fill", "Easy"),
    735: ("asteroid-collision", "Medium"),
    743: ("network-delay-time", "Medium"),
    778: ("swim-in-rising-water", "Hard"),
    785: ("is-graph-bipartite", "Medium"),
    787: ("cheapest-flights-within-k-stops", "Medium"),
    796: ("rotate-string", "Easy"),
    802: ("find-eventual-safe-states", "Medium"),
    827: ("making-a-large-island", "Hard"),
    846: ("hand-of-straights", "Medium"),
    860: ("lemonade-change", "Easy"),
    863: ("all-nodes-distance-k-in-binary-tree", "Medium"),
    875: ("koko-eating-bananas", "Medium"),
    876: ("middle-of-the-linked-list", "Easy"),
    901: ("online-stock-span", "Medium"),
    904: ("fruit-into-baskets", "Medium"),
    907: ("sum-of-subarray-minimums", "Medium"),
    912: ("sort-an-array", "Medium"),
    930: ("binary-subarrays-with-sum", "Medium"),
    931: ("minimum-falling-path-sum", "Medium"),
    947: ("most-stones-removed-with-same-row-or-column", "Medium"),
    987: ("vertical-order-traversal-of-a-binary-tree", "Hard"),
    992: ("subarrays-with-k-different-integers", "Hard"),
    994: ("rotting-oranges", "Medium"),
    1004: ("max-consecutive-ones-iii", "Medium"),
    1008: ("construct-binary-search-tree-from-preorder-traversal", "Medium"),
    1011: ("capacity-to-ship-packages-within-d-days", "Medium"),
    1020: ("number-of-enclaves", "Medium"),
    1021: ("remove-outermost-parentheses", "Easy"),
    1043: ("partition-array-for-maximum-sum", "Medium"),
    1048: ("longest-string-chain", "Medium"),
    1091: ("shortest-path-in-binary-matrix", "Medium"),
    1092: ("shortest-common-supersequence", "Hard"),
    1143: ("longest-common-subsequence", "Medium"),
    1192: ("critical-connections-in-a-network", "Hard"),
    1248: ("count-number-of-nice-subarrays", "Medium"),
    1277: ("count-square-submatrices-with-all-ones", "Medium"),
    1283: ("find-the-smallest-divisor-given-a-threshold", "Medium"),
    1312: ("minimum-insertion-steps-to-make-a-string-palindrome", "Hard"),
    1319: ("number-of-operations-to-make-network-connected", "Medium"),
    1331: ("rank-transform-of-an-array", "Easy"),
    1334: ("find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance", "Medium"),
    1358: ("number-of-substrings-containing-all-three-characters", "Medium"),
    1423: ("maximum-points-you-can-obtain-from-cards", "Medium"),
    1463: ("cherry-pickup-ii", "Hard"),
    1482: ("minimum-number-of-days-to-make-m-bouquets", "Medium"),
    1539: ("kth-missing-positive-number", "Easy"),
    1547: ("minimum-cost-to-cut-a-stick", "Hard"),
    1614: ("maximum-nesting-depth-of-the-parentheses", "Easy"),
    1631: ("path-with-minimum-effort", "Medium"),
    1707: ("maximum-xor-with-an-element-from-array", "Hard"),
    1752: ("check-if-array-is-sorted-and-rotated", "Easy"),
    1781: ("sum-of-beauty-of-all-substrings", "Medium"),
    1838: ("frequency-of-the-most-frequent-element", "Medium"),
    1901: ("find-a-peak-element-ii", "Medium"),
    1903: ("largest-odd-number-in-string", "Easy"),
    1922: ("count-good-numbers", "Medium"),
    1976: ("number-of-ways-to-arrive-at-destination", "Medium"),
    2035: ("partition-array-into-two-arrays-to-minimize-sum-difference", "Hard"),
    2095: ("delete-the-middle-node-of-a-linked-list", "Medium"),
    2104: ("sum-of-subarray-ranges", "Medium"),
    2149: ("rearrange-array-elements-by-sign", "Medium"),
    2220: ("minimum-bit-flips-to-convert-number", "Easy"),
    2385: ("amount-of-time-for-binary-tree-to-be-infected", "Medium"),
}


def kebab(s):
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s or "problem"


def substep_diff(ss_title):
    t = ss_title.lower()
    if "hard" in t:
        return "Hard"
    if "medium" in t:
        return "Medium"
    if "easy" in t or "basic" in t or "learn" in t:
        return "Easy"
    return "Medium"


def main():
    lines = open(SRC, encoding="utf-8").read().splitlines()
    steps = []
    cur_step = None
    cur_sub = None
    seen = set()
    missing_lc = set()

    for raw in lines:
        line = raw.rstrip()
        m = re.match(r"^STEP\s+(\d+):\s*(.*)$", line, re.I)
        if m:
            n = int(m.group(1))
            cur_step = {
                "slug": STEP_SLUGS[n],
                "title": STEP_TITLES.get(n, m.group(2).strip()),
                "order": n,
                "subSteps": [],
            }
            steps.append(cur_step)
            cur_sub = None
            continue

        if cur_step is None:
            continue

        sm = re.match(r"^\[(.*)\]$", line)
        if sm:
            cur_sub = {
                "slug": kebab(sm.group(1)),
                "title": sm.group(1).strip(),
                "order": len(cur_step["subSteps"]) + 1,
                "problems": [],
            }
            cur_step["subSteps"].append(cur_sub)
            continue

        if not line.startswith("- "):
            continue

        # Some source sections (for example Sorting) list problems directly
        # under the step without a bracketed subsection.
        if cur_sub is None:
            cur_sub = {
                "slug": f"{cur_step['slug']}-core",
                "title": "Core Problems",
                "order": len(cur_step["subSteps"]) + 1,
                "problems": [],
            }
            cur_step["subSteps"].append(cur_sub)

        body = line[2:].strip()
        if " : " not in body:
            continue
        title, _, source = body.partition(" : ")
        title = title.strip()
        source = source.strip()

        practice = ""
        leetcode_number = None
        difficulty = substep_diff(cur_sub["title"] if cur_sub else "")

        lcm = re.search(r"LC\s+(\d+)", source)
        if lcm:
            num = int(lcm.group(1))
            leetcode_number = num
            if num in LC and "premium" not in source.lower():
                slug, diff = LC[num]
                practice = f"https://leetcode.com/problems/{slug}/"
                difficulty = diff
            else:
                missing_lc.add(num)

        base = LC[int(lcm.group(1))][0] if (lcm and int(lcm.group(1)) in LC and "premium" not in source.lower()) else kebab(title)
        slug = f"{cur_step['slug']}-{base}"
        i = 2
        while slug in seen:
            slug = f"{cur_step['slug']}-{base}-{i}"
            i += 1
        seen.add(slug)

        cur_sub["problems"].append({
            "slug": slug,
            "title": title,
            "leetcodeNumber": leetcode_number,
            "difficulty": difficulty,
            "links": {"practice": practice, "youtube": "", "article": ""},
            "tags": [cur_step["slug"]],
        })

    data = {
        "version": 2,
        "note": "Generated from the complete Striver A2Z DSA sheet. practice links are LeetCode only (free problems); GFG/Coding-Ninjas/Premium/Theory problems have no practice link. Fill article/youtube links yourself.",
        "steps": steps,
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    total = sum(len(p["problems"]) for s in steps for p in s["subSteps"])
    linked = sum(
        1
        for s in steps
        for p in s["subSteps"]
        for x in p["problems"]
        if x["links"]["practice"]
    )
    print(f"wrote {OUT}")
    print(f"steps={len(steps)} substeps={sum(len(s['subSteps']) for s in steps)} problems={total} (with LeetCode link: {linked})")
    if missing_lc:
        print("WARNING: missing slug map for LC:", sorted(missing_lc))


if __name__ == "__main__":
    main()

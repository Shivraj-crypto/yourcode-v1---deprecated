// ─────────────────────────────────────────────────────────
//  YourCode — Curated Company-Wise Problem Bank
//  Open-Source · Zero Backend · 100% Local Compute
// ─────────────────────────────────────────────────────────

export const DEFAULT_PROBLEMS = [
  {
    id: 'two-sum',
    number: 1,
    title: 'Two Sum',
    difficulty: 'Easy',
    topic: 'Arrays & Hashing',
    category: 'Core Classics',
    companies: ['Amazon', 'Google', 'Meta', 'Apple', 'Microsoft', 'Bloomberg', 'Adobe'],
    fnName: 'twoSum',
    paramNames: ['nums', 'target'],
    description: `<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return <em>indices of the two numbers</em> such that they add up to <code>target</code>.</p><p>You may assume that each input would have <strong>exactly one solution</strong>, and you may not use the same element twice.</p>`,
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' },
      { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
      { input: 'nums = [3,3], target = 6', output: '[0,1]' }
    ],
    constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', 'Only one valid answer exists.'],
    hint: 'Use a hash map to store each number\'s index. For each element, check if target - nums[i] is in the map.',
    starterCode: {
      python: `class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        seen = {}\n        for i, n in enumerate(nums):\n            diff = target - n\n            if diff in seen:\n                return [seen[diff], i]\n            seen[n] = i`,
      javascript: `var twoSum = function(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const diff = target - nums[i];\n    if (map.has(diff)) return [map.get(diff), i];\n    map.set(nums[i], i);\n  }\n};`
    },
    testCases: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] },
      { args: [[3, 3], 6], expected: [0, 1] }
    ]
  },
  {
    id: 'valid-parentheses',
    number: 20,
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    topic: 'Stacks',
    category: 'Core Classics',
    companies: ['Amazon', 'Meta', 'Google', 'Bloomberg', 'Microsoft', 'Netflix'],
    fnName: 'isValid',
    paramNames: ['s'],
    description: `<p>Given a string <code>s</code> containing just the characters <code>'('</code>, <code>')'</code>, <code>'{'</code>, <code>'}'</code>, <code>'['</code> and <code>']'</code>, determine if the input string is valid.</p>`,
    examples: [
      { input: 's = "()"', output: 'true' },
      { input: 's = "()[]{}"', output: 'true' },
      { input: 's = "(]"', output: 'false' }
    ],
    constraints: ['1 <= s.length <= 10^4', 's consists of parentheses only.'],
    hint: 'Use a stack. Push opening brackets and pop when you see a closing bracket. Check if they match.',
    starterCode: {
      python: `class Solution:\n    def isValid(self, s: str) -> bool:\n        stack = []\n        mapping = {')': '(', '}': '{', ']': '['}\n        for c in s:\n            if c in mapping:\n                if not stack or stack[-1] != mapping[c]:\n                    return False\n                stack.pop()\n            else:\n                stack.append(c)\n        return not stack`,
      javascript: `var isValid = function(s) {\n  const stack = [];\n  const map = { ')': '(', '}': '{', ']': '[' };\n  for (const c of s) {\n    if (map[c]) {\n      if (!stack.length || stack[stack.length - 1] !== map[c]) return false;\n      stack.pop();\n    } else {\n      stack.push(c);\n    }\n  }\n  return stack.length === 0;\n};`
    },
    testCases: [
      { args: ['()'], expected: true },
      { args: ['()[]{}'], expected: true },
      { args: ['(]'], expected: false }
    ]
  },
  {
    id: 'generate-parentheses',
    number: 22,
    title: 'Generate Parentheses',
    difficulty: 'Medium',
    topic: 'Backtracking',
    category: 'Core Classics',
    companies: ['Google', 'Amazon', 'Meta', 'Microsoft', 'Uber', 'Adobe'],
    fnName: 'generateParenthesis',
    paramNames: ['n'],
    description: `<p>Given <code>n</code> pairs of parentheses, write a function to <em>generate all combinations of well-formed parentheses</em>.</p>`,
    examples: [
      { input: 'n = 3', output: '["((()))","(()())","(())()","()(())","()()()"]' },
      { input: 'n = 1', output: '["()"]' }
    ],
    constraints: ['1 <= n <= 8'],
    hint: 'Use backtracking: track open and close counts. Add "(" if open < n, add ")" if close < open.',
    starterCode: {
      python: `class Solution:\n    def generateParenthesis(self, n: int) -> list[str]:\n        res = []\n        def backtrack(curr, open_cnt, close_cnt):\n            if len(curr) == 2 * n:\n                res.append(curr)\n                return\n            if open_cnt < n:\n                backtrack(curr + '(', open_cnt + 1, close_cnt)\n            if close_cnt < open_cnt:\n                backtrack(curr + ')', open_cnt, close_cnt + 1)\n        backtrack('', 0, 0)\n        return res`,
      javascript: `var generateParenthesis = function(n) {\n  const res = [];\n  function backtrack(curr, open, close) {\n    if (curr.length === 2 * n) { res.push(curr); return; }\n    if (open < n) backtrack(curr + '(', open + 1, close);\n    if (close < open) backtrack(curr + ')', open, close + 1);\n  }\n  backtrack('', 0, 0);\n  return res;\n};`
    },
    testCases: [
      { args: [3], expected: ['((()))', '(()())', '(())()', '()(())', '()()()'], unorderedArray: true },
      { args: [1], expected: ['()'] }
    ]
  },
  {
    id: 'max-profit',
    number: 121,
    title: 'Best Time to Buy and Sell Stock',
    difficulty: 'Easy',
    topic: 'Sliding Window',
    category: 'Core Classics',
    companies: ['Amazon', 'Meta', 'Google', 'Goldman Sachs', 'Microsoft', 'Bloomberg'],
    fnName: 'maxProfit',
    paramNames: ['prices'],
    description: `<p>You are given an array <code>prices</code> where <code>prices[i]</code> is the price of a given stock on the <code>i<sup>th</sup></code> day. You want to maximize your profit by choosing a <strong>single day</strong> to buy and a <strong>different day in the future</strong> to sell. Return the maximum profit, or <code>0</code> if no profit is possible.</p>`,
    examples: [
      { input: 'prices = [7,1,5,3,6,4]', output: '5' },
      { input: 'prices = [7,6,4,3,1]', output: '0' }
    ],
    constraints: ['1 <= prices.length <= 10^5', '0 <= prices[i] <= 10^4'],
    hint: 'Track the minimum price seen so far and the maximum profit at each step.',
    starterCode: {
      python: `class Solution:\n    def maxProfit(self, prices: list[int]) -> int:\n        min_price = float('inf')\n        max_profit = 0\n        for p in prices:\n            min_price = min(min_price, p)\n            max_profit = max(max_profit, p - min_price)\n        return max_profit`,
      javascript: `var maxProfit = function(prices) {\n  let minPrice = Infinity, maxProfit = 0;\n  for (const p of prices) {\n    minPrice = Math.min(minPrice, p);\n    maxProfit = Math.max(maxProfit, p - minPrice);\n  }\n  return maxProfit;\n};`
    },
    testCases: [
      { args: [[7, 1, 5, 3, 6, 4]], expected: 5 },
      { args: [[7, 6, 4, 3, 1]], expected: 0 }
    ]
  },
  {
    id: 'maximum-subarray',
    number: 53,
    title: 'Maximum Subarray',
    difficulty: 'Medium',
    topic: 'Dynamic Programming',
    category: 'Core Classics',
    companies: ['Amazon', 'Microsoft', 'Apple', 'Google', 'Meta', 'Bloomberg'],
    fnName: 'maxSubArray',
    paramNames: ['nums'],
    description: `<p>Given an integer array <code>nums</code>, find the subarray with the largest sum, and return <em>its sum</em>.</p>`,
    examples: [
      { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', output: '6', explanation: 'The subarray [4,-1,2,1] has the largest sum 6.' },
      { input: 'nums = [1]', output: '1' }
    ],
    constraints: ['1 <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4'],
    hint: 'Use Kadane\'s algorithm: maintain a running sum and reset it to zero whenever it goes negative.',
    starterCode: {
      python: `class Solution:\n    def maxSubArray(self, nums: list[int]) -> int:\n        max_sum = nums[0]\n        curr = 0\n        for n in nums:\n            curr = max(n, curr + n)\n            max_sum = max(max_sum, curr)\n        return max_sum`,
      javascript: `var maxSubArray = function(nums) {\n  let maxSum = nums[0], curr = 0;\n  for (const n of nums) {\n    curr = Math.max(n, curr + n);\n    maxSum = Math.max(maxSum, curr);\n  }\n  return maxSum;\n};`
    },
    testCases: [
      { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
      { args: [[1]], expected: 1 },
      { args: [[5, 4, -1, 7, 8]], expected: 23 }
    ]
  },
  {
    id: 'container-most-water',
    number: 11,
    title: 'Container With Most Water',
    difficulty: 'Medium',
    topic: 'Two Pointers',
    category: 'Core Classics',
    companies: ['Amazon', 'Google', 'Meta', 'Apple', 'Microsoft', 'Adobe'],
    fnName: 'maxArea',
    paramNames: ['height'],
    description: `<p>You are given an integer array <code>height</code> of length <code>n</code>. Find two lines that together with the x-axis form a container, such that the container contains the most water. Return <em>the maximum amount of water a container can store</em>.</p>`,
    examples: [
      { input: 'height = [1,8,6,2,5,4,8,3,7]', output: '49' }
    ],
    constraints: ['n == height.length', '2 <= n <= 10^5', '0 <= height[i] <= 10^4'],
    hint: 'Use two pointers starting from both ends. Move the pointer pointing to the shorter line inward.',
    starterCode: {
      python: `class Solution:\n    def maxArea(self, height: list[int]) -> int:\n        l, r = 0, len(height) - 1\n        best = 0\n        while l < r:\n            best = max(best, min(height[l], height[r]) * (r - l))\n            if height[l] < height[r]:\n                l += 1\n            else:\n                r -= 1\n        return best`,
      javascript: `var maxArea = function(height) {\n  let l = 0, r = height.length - 1, best = 0;\n  while (l < r) {\n    best = Math.max(best, Math.min(height[l], height[r]) * (r - l));\n    if (height[l] < height[r]) l++; else r--;\n  }\n  return best;\n};`
    },
    testCases: [
      { args: [[1, 8, 6, 2, 5, 4, 8, 3, 7]], expected: 49 },
      { args: [[1, 1]], expected: 1 }
    ]
  },
  {
    id: 'longest-substring-no-repeat',
    number: 3,
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    topic: 'Sliding Window',
    category: 'Core Classics',
    companies: ['Amazon', 'Meta', 'Google', 'Microsoft', 'Bloomberg', 'Netflix'],
    fnName: 'lengthOfLongestSubstring',
    paramNames: ['s'],
    description: `<p>Given a string <code>s</code>, find the length of the <strong>longest substring</strong> without repeating characters.</p>`,
    examples: [
      { input: 's = "abcabcbb"', output: '3', explanation: 'The answer is "abc", with the length of 3.' },
      { input: 's = "bbbbb"', output: '1' },
      { input: 's = "pwwkew"', output: '3' }
    ],
    constraints: ['0 <= s.length <= 5 * 10^4'],
    hint: 'Use a sliding window with a set. Expand right; if duplicate found, shrink from left.',
    starterCode: {
      python: `class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        seen = set()\n        l = best = 0\n        for r in range(len(s)):\n            while s[r] in seen:\n                seen.remove(s[l])\n                l += 1\n            seen.add(s[r])\n            best = max(best, r - l + 1)\n        return best`,
      javascript: `var lengthOfLongestSubstring = function(s) {\n  const seen = new Set();\n  let l = 0, best = 0;\n  for (let r = 0; r < s.length; r++) {\n    while (seen.has(s[r])) { seen.delete(s[l]); l++; }\n    seen.add(s[r]);\n    best = Math.max(best, r - l + 1);\n  }\n  return best;\n};`
    },
    testCases: [
      { args: ['abcabcbb'], expected: 3 },
      { args: ['bbbbb'], expected: 1 },
      { args: ['pwwkew'], expected: 3 }
    ]
  },
  {
    id: 'coin-change',
    number: 322,
    title: 'Coin Change',
    difficulty: 'Medium',
    topic: 'Dynamic Programming',
    category: 'Core Classics',
    companies: ['Amazon', 'Google', 'Microsoft', 'Uber', 'Goldman Sachs', 'Apple'],
    fnName: 'coinChange',
    paramNames: ['coins', 'amount'],
    description: `<p>You are given an integer array <code>coins</code> representing coins of different denominations and an integer <code>amount</code> representing a total amount of money. Return the <em>fewest number of coins</em> needed to make up that amount. Return <code>-1</code> if that amount cannot be made up.</p>`,
    examples: [
      { input: 'coins = [1,2,5], amount = 11', output: '3', explanation: '11 = 5 + 5 + 1' },
      { input: 'coins = [2], amount = 3', output: '-1' }
    ],
    constraints: ['1 <= coins.length <= 12', '1 <= coins[i] <= 2^31 - 1', '0 <= amount <= 10^4'],
    hint: 'Use bottom-up DP: dp[i] = min coins to make amount i. For each coin, dp[i] = min(dp[i], dp[i-coin]+1).',
    starterCode: {
      python: `class Solution:\n    def coinChange(self, coins: list[int], amount: int) -> int:\n        dp = [float('inf')] * (amount + 1)\n        dp[0] = 0\n        for a in range(1, amount + 1):\n            for c in coins:\n                if c <= a:\n                    dp[a] = min(dp[a], dp[a - c] + 1)\n        return dp[amount] if dp[amount] != float('inf') else -1`,
      javascript: `var coinChange = function(coins, amount) {\n  const dp = new Array(amount + 1).fill(Infinity);\n  dp[0] = 0;\n  for (let a = 1; a <= amount; a++) {\n    for (const c of coins) {\n      if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);\n    }\n  }\n  return dp[amount] === Infinity ? -1 : dp[amount];\n};`
    },
    testCases: [
      { args: [[1, 2, 5], 11], expected: 3 },
      { args: [[2], 3], expected: -1 },
      { args: [[1], 0], expected: 0 }
    ]
  },
  {
    id: 'binary-search',
    number: 704,
    title: 'Binary Search',
    difficulty: 'Easy',
    topic: 'Binary Search',
    category: 'Core Classics',
    companies: ['Google', 'Apple', 'Microsoft', 'Amazon', 'Uber'],
    fnName: 'search',
    paramNames: ['nums', 'target'],
    description: `<p>Given a sorted array of integers <code>nums</code> and a <code>target</code>, return the index of target or <code>-1</code> if not found. You must write an algorithm with <code>O(log n)</code> runtime.</p>`,
    examples: [
      { input: 'nums = [-1,0,3,5,9,12], target = 9', output: '4' },
      { input: 'nums = [-1,0,3,5,9,12], target = 2', output: '-1' }
    ],
    constraints: ['1 <= nums.length <= 10^4', 'nums is sorted in ascending order.'],
    hint: 'Classic binary search: maintain lo and hi pointers, check mid.',
    starterCode: {
      python: `class Solution:\n    def search(self, nums: list[int], target: int) -> int:\n        lo, hi = 0, len(nums) - 1\n        while lo <= hi:\n            mid = (lo + hi) // 2\n            if nums[mid] == target:\n                return mid\n            elif nums[mid] < target:\n                lo = mid + 1\n            else:\n                hi = mid - 1\n        return -1`,
      javascript: `var search = function(nums, target) {\n  let lo = 0, hi = nums.length - 1;\n  while (lo <= hi) {\n    const mid = Math.floor((lo + hi) / 2);\n    if (nums[mid] === target) return mid;\n    if (nums[mid] < target) lo = mid + 1;\n    else hi = mid - 1;\n  }\n  return -1;\n};`
    },
    testCases: [
      { args: [[-1, 0, 3, 5, 9, 12], 9], expected: 4 },
      { args: [[-1, 0, 3, 5, 9, 12], 2], expected: -1 }
    ]
  },
  {
    id: 'valid-palindrome',
    number: 125,
    title: 'Valid Palindrome',
    difficulty: 'Easy',
    topic: 'Two Pointers',
    category: 'Core Classics',
    companies: ['Meta', 'Apple', 'Amazon', 'Microsoft', 'Bloomberg'],
    fnName: 'isPalindrome',
    paramNames: ['s'],
    description: `<p>Given a string <code>s</code>, determine if it is a palindrome, considering only alphanumeric characters and ignoring cases.</p>`,
    examples: [
      { input: 's = "A man, a plan, a canal: Panama"', output: 'true' },
      { input: 's = "race a car"', output: 'false' }
    ],
    constraints: ['1 <= s.length <= 2 * 10^5'],
    hint: 'Filter to alphanumeric, lowercase, then use two pointers from both ends.',
    starterCode: {
      python: `class Solution:\n    def isPalindrome(self, s: str) -> bool:\n        cleaned = ''.join(c.lower() for c in s if c.isalnum())\n        return cleaned == cleaned[::-1]`,
      javascript: `var isPalindrome = function(s) {\n  const cleaned = s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();\n  let l = 0, r = cleaned.length - 1;\n  while (l < r) {\n    if (cleaned[l] !== cleaned[r]) return false;\n    l++; r--;\n  }\n  return true;\n};`
    },
    testCases: [
      { args: ['A man, a plan, a canal: Panama'], expected: true },
      { args: ['race a car'], expected: false },
      { args: [' '], expected: true }
    ]
  },
  {
    id: 'three-sum',
    number: 15,
    title: '3Sum',
    difficulty: 'Medium',
    topic: 'Two Pointers',
    category: 'Core Classics',
    companies: ['Meta', 'Amazon', 'Google', 'Apple', 'Microsoft', 'Bloomberg'],
    fnName: 'threeSum',
    paramNames: ['nums'],
    description: `<p>Given an integer array <code>nums</code>, return all the triplets <code>[nums[i], nums[j], nums[k]]</code> such that <code>i != j</code>, <code>i != k</code>, and <code>j != k</code>, and <code>nums[i] + nums[j] + nums[k] == 0</code>. The solution set must not contain duplicate triplets.</p>`,
    examples: [
      { input: 'nums = [-1,0,1,2,-1,-4]', output: '[[-1,-1,2],[-1,0,1]]' },
      { input: 'nums = [0,1,1]', output: '[]' },
      { input: 'nums = [0,0,0]', output: '[[0,0,0]]' }
    ],
    constraints: ['3 <= nums.length <= 3000', '-10^5 <= nums[i] <= 10^5'],
    hint: 'Sort array. For each i, use two pointers (l, r) on the remaining subarray to find pairs summing to -nums[i].',
    starterCode: {
      python: `class Solution:\n    def threeSum(self, nums: list[int]) -> list[list[int]]:\n        nums.sort()\n        res = []\n        for i in range(len(nums) - 2):\n            if i > 0 and nums[i] == nums[i - 1]:\n                continue\n            l, r = i + 1, len(nums) - 1\n            while l < r:\n                s = nums[i] + nums[l] + nums[r]\n                if s < 0:\n                    l += 1\n                elif s > 0:\n                    r -= 1\n                else:\n                    res.append([nums[i], nums[l], nums[r]])\n                    while l < r and nums[l] == nums[l + 1]: l += 1\n                    while l < r and nums[r] == nums[r - 1]: r -= 1\n                    l += 1; r -= 1\n        return res`,
      javascript: `var threeSum = function(nums) {\n  nums.sort((a, b) => a - b);\n  const res = [];\n  for (let i = 0; i < nums.length - 2; i++) {\n    if (i > 0 && nums[i] === nums[i - 1]) continue;\n    let l = i + 1, r = nums.length - 1;\n    while (l < r) {\n      const s = nums[i] + nums[l] + nums[r];\n      if (s < 0) l++;\n      else if (s > 0) r--;\n      else {\n        res.push([nums[i], nums[l], nums[r]]);\n        while (l < r && nums[l] === nums[l + 1]) l++;\n        while (l < r && nums[r] === nums[r - 1]) r--;\n        l++; r--;\n      }\n    }\n  }\n  return res;\n};`
    },
    testCases: [
      { args: [[-1, 0, 1, 2, -1, -4]], expected: [[-1, -1, 2], [-1, 0, 1]], unorderedArray: true },
      { args: [[0, 1, 1]], expected: [] },
      { args: [[0, 0, 0]], expected: [[0, 0, 0]] }
    ]
  },
  {
    id: 'product-except-self',
    number: 238,
    title: 'Product of Array Except Self',
    difficulty: 'Medium',
    topic: 'Arrays & Prefix',
    category: 'Core Classics',
    companies: ['Amazon', 'Meta', 'Apple', 'Microsoft', 'Google', 'Uber'],
    fnName: 'productExceptSelf',
    paramNames: ['nums'],
    description: `<p>Given an integer array <code>nums</code>, return an array <code>answer</code> such that <code>answer[i]</code> is equal to the product of all the elements of <code>nums</code> except <code>nums[i]</code>. You must write an algorithm that runs in O(n) time and without using the division operation.</p>`,
    examples: [
      { input: 'nums = [1,2,3,4]', output: '[24,12,8,6]' },
      { input: 'nums = [-1,1,0,-3,3]', output: '[0,0,9,0,0]' }
    ],
    constraints: ['2 <= nums.length <= 10^5'],
    hint: 'Use two passes: left-to-right prefix products, then right-to-left suffix products.',
    starterCode: {
      python: `class Solution:\n    def productExceptSelf(self, nums: list[int]) -> list[int]:\n        n = len(nums)\n        ans = [1] * n\n        prefix = 1\n        for i in range(n):\n            ans[i] = prefix\n            prefix *= nums[i]\n        suffix = 1\n        for i in range(n - 1, -1, -1):\n            ans[i] *= suffix\n            suffix *= nums[i]\n        return ans`,
      javascript: `var productExceptSelf = function(nums) {\n  const n = nums.length, ans = new Array(n).fill(1);\n  let prefix = 1;\n  for (let i = 0; i < n; i++) { ans[i] = prefix; prefix *= nums[i]; }\n  let suffix = 1;\n  for (let i = n - 1; i >= 0; i--) { ans[i] *= suffix; suffix *= nums[i]; }\n  return ans;\n};`
    },
    testCases: [
      { args: [[1, 2, 3, 4]], expected: [24, 12, 8, 6] },
      { args: [[-1, 1, 0, -3, 3]], expected: [0, 0, 9, 0, 0] }
    ]
  },
  {
    id: 'merge-intervals',
    number: 56,
    title: 'Merge Intervals',
    difficulty: 'Medium',
    topic: 'Intervals',
    category: 'Core Classics',
    companies: ['Meta', 'Google', 'Amazon', 'Uber', 'Bloomberg', 'Microsoft'],
    fnName: 'merge',
    paramNames: ['intervals'],
    description: `<p>Given an array of <code>intervals</code> where <code>intervals[i] = [start_i, end_i]</code>, merge all overlapping intervals.</p>`,
    examples: [
      { input: 'intervals = [[1,3],[2,6],[8,10],[15,18]]', output: '[[1,6],[8,10],[15,18]]' },
      { input: 'intervals = [[1,4],[4,5]]', output: '[[1,5]]' }
    ],
    constraints: ['1 <= intervals.length <= 10^4'],
    hint: 'Sort by start time, then merge overlapping intervals greedily.',
    starterCode: {
      python: `class Solution:\n    def merge(self, intervals: list[list[int]]) -> list[list[int]]:\n        intervals.sort(key=lambda x: x[0])\n        merged = [intervals[0]]\n        for start, end in intervals[1:]:\n            if start <= merged[-1][1]:\n                merged[-1][1] = max(merged[-1][1], end)\n            else:\n                merged.append([start, end])\n        return merged`,
      javascript: `var merge = function(intervals) {\n  intervals.sort((a, b) => a[0] - b[0]);\n  const merged = [intervals[0]];\n  for (let i = 1; i < intervals.length; i++) {\n    const [s, e] = intervals[i];\n    if (s <= merged[merged.length - 1][1]) {\n      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);\n    } else merged.push([s, e]);\n  }\n  return merged;\n};`
    },
    testCases: [
      { args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] },
      { args: [[[1, 4], [4, 5]]], expected: [[1, 5]] }
    ]
  },
  {
    id: 'number-of-islands',
    number: 200,
    title: 'Number of Islands',
    difficulty: 'Medium',
    topic: 'Graphs / BFS & DFS',
    category: 'Core Classics',
    companies: ['Amazon', 'Google', 'Meta', 'Bloomberg', 'Microsoft', 'Uber'],
    fnName: 'numIslands',
    paramNames: ['grid'],
    description: `<p>Given an <code>m x n</code> 2D binary grid which represents a map of <code>'1'</code>s (land) and <code>'0'</code>s (water), return <em>the number of islands</em>.</p>`,
    examples: [
      { input: 'grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]', output: '3' }
    ],
    constraints: ['1 <= m, n <= 300'],
    hint: 'Traverse each cell; when you find a "1", increment count and DFS to sink all connected "1"s.',
    starterCode: {
      python: `class Solution:\n    def numIslands(self, grid: list[list[str]]) -> int:\n        if not grid: return 0\n        rows, cols = len(grid), len(grid[0])\n        count = 0\n        def dfs(r, c):\n            if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] != "1":\n                return\n            grid[r][c] = "0"\n            dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1)\n        for r in range(rows):\n            for c in range(cols):\n                if grid[r][c] == "1":\n                    count += 1\n                    dfs(r, c)\n        return count`,
      javascript: `var numIslands = function(grid) {\n  let count = 0;\n  const rows = grid.length, cols = grid[0].length;\n  function dfs(r, c) {\n    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== "1") return;\n    grid[r][c] = "0";\n    dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1);\n  }\n  for (let r = 0; r < rows; r++)\n    for (let c = 0; c < cols; c++)\n      if (grid[r][c] === "1") { count++; dfs(r, c); }\n  return count;\n};`
    },
    testCases: [
      { args: [[['1','1','0','0','0'],['1','1','0','0','0'],['0','0','1','0','0'],['0','0','0','1','1']]], expected: 3 }
    ]
  },
  {
    id: 'house-robber',
    number: 198,
    title: 'House Robber',
    difficulty: 'Medium',
    topic: 'Dynamic Programming',
    category: 'Core Classics',
    companies: ['Amazon', 'Google', 'Apple', 'Microsoft', 'Adobe', 'Goldman Sachs'],
    fnName: 'rob',
    paramNames: ['nums'],
    description: `<p>You are a professional robber. Adjacent houses have connected security. Given <code>nums</code> representing money in each house, return the max you can rob without alerting police (no two adjacent houses).</p>`,
    examples: [
      { input: 'nums = [1,2,3,1]', output: '4' },
      { input: 'nums = [2,7,9,3,1]', output: '12' }
    ],
    constraints: ['1 <= nums.length <= 100'],
    hint: 'DP: rob1, rob2 representing max loot up to i-2 and i-1.',
    starterCode: {
      python: `class Solution:\n    def rob(self, nums: list[int]) -> int:\n        rob1, rob2 = 0, 0\n        for n in nums:\n            rob1, rob2 = rob2, max(rob1 + n, rob2)\n        return rob2`,
      javascript: `var rob = function(nums) {\n  let rob1 = 0, rob2 = 0;\n  for (const n of nums) {\n    const temp = Math.max(rob1 + n, rob2);\n    rob1 = rob2; rob2 = temp;\n  }\n  return rob2;\n};`
    },
    testCases: [
      { args: [[1, 2, 3, 1]], expected: 4 },
      { args: [[2, 7, 9, 3, 1]], expected: 12 }
    ]
  },
  {
    id: 'trapping-rain-water',
    number: 42,
    title: 'Trapping Rain Water',
    difficulty: 'Hard',
    topic: 'Two Pointers',
    category: 'Core Classics',
    companies: ['Goldman Sachs', 'Amazon', 'Google', 'Meta', 'Microsoft', 'Apple'],
    fnName: 'trap',
    paramNames: ['height'],
    description: `<p>Given <code>n</code> non-negative integers representing an elevation map where each bar width is <code>1</code>, compute how much water it can trap after raining.</p>`,
    examples: [
      { input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]', output: '6' },
      { input: 'height = [4,2,0,3,2,5]', output: '9' }
    ],
    constraints: ['1 <= n <= 2 * 10^4'],
    hint: 'Two pointers (l, r) with leftMax and rightMax.',
    starterCode: {
      python: `class Solution:\n    def trap(self, height: list[int]) -> int:\n        l, r = 0, len(height) - 1\n        l_max = r_max = water = 0\n        while l < r:\n            if height[l] < height[r]:\n                l_max = max(l_max, height[l])\n                water += l_max - height[l]\n                l += 1\n            else:\n                r_max = max(r_max, height[r])\n                water += r_max - height[r]\n                r -= 1\n        return water`,
      javascript: `var trap = function(height) {\n  let l = 0, r = height.length - 1, lMax = 0, rMax = 0, water = 0;\n  while (l < r) {\n    if (height[l] < height[r]) {\n      lMax = Math.max(lMax, height[l]);\n      water += lMax - height[l++];\n    } else {\n      rMax = Math.max(rMax, height[r]);\n      water += rMax - height[r--];\n    }\n  }\n  return water;\n};`
    },
    testCases: [
      { args: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expected: 6 },
      { args: [[4, 2, 0, 3, 2, 5]], expected: 9 }
    ]
  },
  {
    id: 'fp-bloomberg-jump-game',
    number: 55,
    title: 'Jump Game',
    difficulty: 'Medium',
    topic: 'Greedy',
    category: 'FastPrep Onsite',
    stage: 'ONSITE · Bloomberg',
    companies: ['Bloomberg', 'Amazon', 'Google', 'Meta'],
    fnName: 'canJump',
    paramNames: ['nums'],
    description: `<p>You are given an array <code>nums</code>. You start at index <code>0</code>, and <code>nums[i]</code> is the max jump length from index <code>i</code>. Return <code>true</code> if you can reach the last index.</p>`,
    examples: [
      { input: 'nums = [2,3,1,1,4]', output: 'true' },
      { input: 'nums = [3,2,1,0,4]', output: 'false' }
    ],
    constraints: ['1 <= nums.length <= 10^5'],
    hint: 'Track the farthest reachable index as you iterate left to right.',
    starterCode: {
      python: `class Solution:\n    def canJump(self, nums: list[int]) -> bool:\n        reach = 0\n        for i, step in enumerate(nums):\n            if i > reach:\n                return False\n            reach = max(reach, i + step)\n        return True`,
      javascript: `var canJump = function(nums) {\n  let reach = 0;\n  for (let i = 0; i < nums.length; i++) {\n    if (i > reach) return false;\n    reach = Math.max(reach, i + nums[i]);\n  }\n  return true;\n};`
    },
    testCases: [
      { args: [[2, 3, 1, 1, 4]], expected: true },
      { args: [[3, 2, 1, 0, 4]], expected: false },
      { args: [[0]], expected: true }
    ]
  }
];

export const COMPANY_LIST = [
  'Amazon', 'Google', 'Meta', 'Microsoft', 'Apple',
  'Goldman Sachs', 'Bloomberg', 'Uber', 'Netflix',
  'Adobe', 'TikTok', 'Capital One', 'Autodesk', 'Scale AI'
];

export function getProblemCompanies(prob) {
  return prob.companies || ['Amazon', 'Google', 'Meta'];
}

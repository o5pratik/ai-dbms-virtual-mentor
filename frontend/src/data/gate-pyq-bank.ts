export type PyqQuestion = {
  id: string;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export const GATE_PYQ_BANK: PyqQuestion[] = [
  {
    id: 'ra-01',
    topic: 'Relational Algebra',
    question:
      'Which relational-algebra operation keeps only tuples that satisfy a given predicate?',
    options: ['Projection', 'Selection', 'Rename', 'Union'],
    correctIndex: 1,
    explanation:
      'Selection (σ) filters rows using a predicate; projection chooses columns.',
  },
  {
    id: 'ra-02',
    topic: 'Relational Algebra',
    question:
      'Relations R(A, B) and S(B, C) have 10 and 20 tuples. What is the maximum possible size of R ⋈ S?',
    options: ['20', '30', '100', '200'],
    correctIndex: 3,
    explanation:
      'If every tuple has the same B value, each tuple of R joins with every tuple of S: 10 × 20 = 200.',
  },
  {
    id: 'ra-03',
    topic: 'Relational Algebra',
    question:
      'Which operation requires its two input relations to be union-compatible?',
    options: [
      'Natural join',
      'Cartesian product',
      'Set difference',
      'Division',
    ],
    correctIndex: 2,
    explanation:
      'Set difference requires the same number of attributes with compatible domains.',
  },
  {
    id: 'ra-04',
    topic: 'Relational Algebra',
    question:
      'The division operation R(X, Y) ÷ S(Y) is commonly used to express which kind of query?',
    options: ['There exists', 'For all', 'Exactly one', 'None'],
    correctIndex: 1,
    explanation:
      'Division finds X values related to every Y value in S, so it captures universal quantification.',
  },
  {
    id: 'ra-05',
    topic: 'Relational Algebra',
    question:
      'Which expression returns attributes A and C from tuples of R where B > 10?',
    options: [
      'σA,C(πB>10(R))',
      'πA,C(σB>10(R))',
      'πB>10(σA,C(R))',
      'σB>10(πA,C(R))',
    ],
    correctIndex: 1,
    explanation:
      'Filter rows first with selection, then project the required A and C attributes.',
  },
  {
    id: 'ra-06',
    topic: 'Relational Algebra',
    question:
      'A natural join differs from a Cartesian product because it additionally does what?',
    options: [
      'Removes every duplicate tuple',
      'Matches equally named attributes and removes duplicate join columns',
      'Sorts both inputs',
      'Requires a primary key',
    ],
    correctIndex: 1,
    explanation:
      'Natural join equates common attribute names and retains one copy of each common join attribute.',
  },
  {
    id: 'sql-01',
    topic: 'SQL',
    question:
      'Which clause filters groups after aggregate values have been computed?',
    options: ['WHERE', 'HAVING', 'ORDER BY', 'DISTINCT'],
    correctIndex: 1,
    explanation:
      'WHERE filters input rows; HAVING filters the groups formed by GROUP BY.',
  },
  {
    id: 'sql-02',
    topic: 'SQL',
    question: 'What does COUNT(column_name) exclude from its result?',
    options: [
      'Duplicate values',
      'Zero values',
      'NULL values',
      'Negative values',
    ],
    correctIndex: 2,
    explanation:
      'COUNT(column) counts non-NULL values, while COUNT(*) counts rows.',
  },
  {
    id: 'sql-03',
    topic: 'SQL',
    question:
      'Which join preserves every row of the left relation and fills unmatched right-side attributes with NULL?',
    options: ['INNER JOIN', 'LEFT OUTER JOIN', 'CROSS JOIN', 'NATURAL JOIN'],
    correctIndex: 1,
    explanation: 'A left outer join preserves all rows from its left input.',
  },
  {
    id: 'sql-04',
    topic: 'SQL',
    question:
      'A subquery used with IN returns an empty set. What is the result of x IN (subquery)?',
    options: ['TRUE', 'FALSE', 'NULL for every x', 'Syntax error'],
    correctIndex: 1,
    explanation:
      'No value can match an empty set, so the membership test is false.',
  },
  {
    id: 'sql-05',
    topic: 'SQL',
    question:
      'Which constraint both rejects NULL and prevents duplicate values?',
    options: ['CHECK', 'FOREIGN KEY', 'PRIMARY KEY', 'DEFAULT'],
    correctIndex: 2,
    explanation: 'A primary key is unique and cannot be NULL.',
  },
  {
    id: 'sql-06',
    topic: 'SQL',
    question: 'Which query correctly finds the second-highest distinct salary?',
    options: [
      'SELECT MAX(salary) FROM Employee',
      'SELECT MAX(salary) FROM Employee WHERE salary < (SELECT MAX(salary) FROM Employee)',
      'SELECT MIN(salary) FROM Employee',
      'SELECT salary FROM Employee LIMIT 2',
    ],
    correctIndex: 1,
    explanation:
      'The inner query finds the maximum; the outer query finds the maximum below it.',
  },
  {
    id: 'norm-01',
    topic: 'Normalization',
    question:
      'For R(A, B, C) with A → B and B → C, which attribute is a candidate key?',
    options: ['A', 'B', 'C', 'BC'],
    correctIndex: 0,
    explanation: 'A+ = {A, B, C}; neither B nor C can determine A.',
  },
  {
    id: 'norm-02',
    topic: 'Normalization',
    question:
      'A relation is in BCNF when the determinant of every non-trivial functional dependency is what?',
    options: [
      'A prime attribute',
      'A superkey',
      'A foreign key',
      'A multivalued attribute',
    ],
    correctIndex: 1,
    explanation:
      'BCNF requires X to be a superkey for every non-trivial FD X → Y.',
  },
  {
    id: 'norm-03',
    topic: 'Normalization',
    question:
      'Which dependency is removed when a relation is converted from 1NF to 2NF?',
    options: [
      'Transitive dependency',
      'Partial dependency of a non-prime attribute on a candidate key',
      'Multivalued dependency',
      'Join dependency',
    ],
    correctIndex: 1,
    explanation:
      '2NF removes partial dependencies on a proper subset of a composite candidate key.',
  },
  {
    id: 'norm-04',
    topic: 'Normalization',
    question:
      'A lossless binary decomposition of R into R1 and R2 is guaranteed when their common attributes functionally determine what?',
    options: [
      'Neither relation',
      'R1 or R2',
      'Only non-prime attributes',
      'Every foreign key',
    ],
    correctIndex: 1,
    explanation:
      'The lossless-join test requires (R1 ∩ R2) → R1 or (R1 ∩ R2) → R2.',
  },
  {
    id: 'norm-05',
    topic: 'Normalization',
    question:
      'Which normal form specifically addresses non-trivial multivalued dependencies?',
    options: ['2NF', '3NF', 'BCNF', '4NF'],
    correctIndex: 3,
    explanation:
      '4NF requires each determinant of a non-trivial multivalued dependency to be a superkey.',
  },
  {
    id: 'norm-06',
    topic: 'Normalization',
    question:
      'If X+ under a set of functional dependencies contains every attribute of R, then X is at least what?',
    options: [
      'A foreign key',
      'A superkey',
      'A non-prime attribute',
      'A partial key',
    ],
    correctIndex: 1,
    explanation:
      'A set whose closure includes all relation attributes is a superkey.',
  },
  {
    id: 'tx-01',
    topic: 'Transactions',
    question: 'Which ACID property gives all-or-nothing execution?',
    options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
    correctIndex: 0,
    explanation:
      'Atomicity ensures a transaction either completes fully or is rolled back.',
  },
  {
    id: 'tx-02',
    topic: 'Transactions',
    question:
      'A schedule is conflict-serializable exactly when its precedence graph is what?',
    options: ['Complete', 'Acyclic', 'Undirected', 'Disconnected'],
    correctIndex: 1,
    explanation: 'A directed cycle means no equivalent serial ordering exists.',
  },
  {
    id: 'tx-03',
    topic: 'Transactions',
    question: 'Strict two-phase locking holds exclusive locks until when?',
    options: [
      'The first read',
      'The growing phase ends',
      'Commit or abort',
      'Another transaction requests them',
    ],
    correctIndex: 2,
    explanation:
      'Holding write locks until commit or abort prevents dirty reads and cascading aborts.',
  },
  {
    id: 'tx-04',
    topic: 'Transactions',
    question:
      'Reading a value written by an uncommitted transaction is called what?',
    options: ['Lost update', 'Dirty read', 'Phantom read', 'Deadlock'],
    correctIndex: 1,
    explanation: 'A dirty read observes data that may later be rolled back.',
  },
  {
    id: 'tx-05',
    topic: 'Transactions',
    question:
      'Which deadlock-prevention scheme aborts an older transaction when it requests a lock held by a younger transaction?',
    options: ['Wait-die', 'Wound-wait', 'Timestamp ordering', 'Validation'],
    correctIndex: 1,
    explanation:
      'In wound-wait, an older transaction wounds (aborts) a younger lock holder.',
  },
  {
    id: 'tx-06',
    topic: 'Transactions',
    question:
      'A recoverable schedule requires a transaction that reads from another transaction to commit when?',
    options: [
      'Before the writer commits',
      'Only after the writer commits',
      'At the same instant',
      'Before it performs the read',
    ],
    correctIndex: 1,
    explanation:
      'The reader must not commit before the transaction whose value it read.',
  },
  {
    id: 'idx-01',
    topic: 'Indexing and Hashing',
    question: 'Where are data-entry pointers normally stored in a B+ tree?',
    options: [
      'Root only',
      'Internal nodes only',
      'Leaf nodes',
      'Outside the tree',
    ],
    correctIndex: 2,
    explanation:
      'Internal nodes direct searches; leaf nodes store data entries and are linked for range scans.',
  },
  {
    id: 'idx-02',
    topic: 'Indexing and Hashing',
    question: 'Which query is generally best supported by a hash index?',
    options: [
      'Equality search',
      'Range search',
      'Prefix ordering',
      'Minimum value scan',
    ],
    correctIndex: 0,
    explanation:
      'Hashing maps an equality key directly to a bucket but does not preserve order.',
  },
  {
    id: 'idx-03',
    topic: 'Indexing and Hashing',
    question:
      'A clustering index is created on an ordering non-key field. Its entries typically point to what?',
    options: [
      'Every individual record',
      'The first block for each distinct field value',
      'Only overflow blocks',
      'The root of another index',
    ],
    correctIndex: 1,
    explanation:
      'A clustering index is sparse and commonly points to the first block of each value cluster.',
  },
  {
    id: 'idx-04',
    topic: 'Indexing and Hashing',
    question:
      'What is a key advantage of extendible hashing over static hashing?',
    options: [
      'It preserves sort order',
      'It grows the directory and splits buckets dynamically',
      'It never uses overflow pages',
      'It supports joins directly',
    ],
    correctIndex: 1,
    explanation:
      'Extendible hashing adapts to growth using a directory and local/global depths.',
  },
  {
    id: 'idx-05',
    topic: 'Indexing and Hashing',
    question: 'In a dense index, an index entry exists for what?',
    options: [
      'Every search-key value or record',
      'Only every tenth block',
      'Only the smallest key',
      'Only overflow records',
    ],
    correctIndex: 0,
    explanation:
      'A dense index has an entry for every search-key value, often every record.',
  },
  {
    id: 'idx-06',
    topic: 'Indexing and Hashing',
    question: 'Why are B+ tree leaf nodes linked?',
    options: [
      'To detect deadlocks',
      'To support efficient sequential and range access',
      'To enforce uniqueness',
      'To store transaction logs',
    ],
    correctIndex: 1,
    explanation:
      'Linked leaves allow ordered scanning without returning to internal nodes.',
  },
  {
    id: 'er-01',
    topic: 'ER Model',
    question:
      'A weak entity is identified by its partial key together with what?',
    options: [
      'The owner entity key',
      'Any derived attribute',
      'An unrelated key',
      'A multivalued attribute',
    ],
    correctIndex: 0,
    explanation:
      'The owner key plus the weak entity partial key uniquely identifies it.',
  },
  {
    id: 'er-02',
    topic: 'ER Model',
    question:
      'Total participation of an entity set in a relationship means what?',
    options: [
      'No entity participates',
      'Every entity participates at least once',
      'Exactly one entity participates',
      'Participation is optional',
    ],
    correctIndex: 1,
    explanation:
      'Total participation requires every entity in that set to appear in the relationship.',
  },
  {
    id: 'er-03',
    topic: 'ER Model',
    question:
      'When mapping a multivalued attribute to relations, the usual design creates what?',
    options: [
      'A separate relation containing the owner key and attribute value',
      'A NULL column',
      'A view only',
      'A derived primary key in the owner',
    ],
    correctIndex: 0,
    explanation:
      'A separate relation represents repeated values and includes the owning entity key.',
  },
  {
    id: 'er-04',
    topic: 'ER Model',
    question:
      'In a one-to-many relationship, the foreign key is normally placed on which side?',
    options: ['The one side', 'The many side', 'Both sides', 'Neither side'],
    correctIndex: 1,
    explanation:
      'Each row on the many side refers to its associated row on the one side.',
  },
  {
    id: 'qp-01',
    topic: 'Query Processing',
    question:
      'Pushing selections below joins usually improves a query plan because it does what?',
    options: [
      'Adds more tuples',
      'Reduces intermediate relation sizes',
      'Forces a Cartesian product',
      'Disables indexes',
    ],
    correctIndex: 1,
    explanation:
      'Early filtering reduces the data processed by later, more expensive operators.',
  },
  {
    id: 'qp-02',
    topic: 'Query Processing',
    question:
      'Which join algorithm is especially suitable when both inputs are already sorted on the join attribute?',
    options: [
      'Nested-loop join',
      'Sort-merge join',
      'Hash join only',
      'Cartesian join',
    ],
    correctIndex: 1,
    explanation: 'Sort-merge join can merge two ordered streams efficiently.',
  },
  {
    id: 'qp-03',
    topic: 'Query Processing',
    question: 'A hash join is normally applicable to which join condition?',
    options: ['Equality', 'Less than', 'Not equal', 'LIKE pattern'],
    correctIndex: 0,
    explanation:
      'Hash joins partition matching equality keys into corresponding buckets.',
  },
  {
    id: 'qp-04',
    topic: 'Query Processing',
    question:
      'The primary goal of a cost-based query optimizer is to choose what?',
    options: [
      'The shortest SQL text',
      'A logically different answer',
      'The estimated least-cost equivalent execution plan',
      'The plan with the most joins',
    ],
    correctIndex: 2,
    explanation:
      'The optimizer compares equivalent plans using estimated I/O, CPU, and cardinalities.',
  },
];

export const GATE_PYQ_TOPICS = [
  'All topics',
  ...Array.from(new Set(GATE_PYQ_BANK.map((question) => question.topic))),
];

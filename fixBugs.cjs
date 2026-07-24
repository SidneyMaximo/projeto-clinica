const fs = require('fs');
let content = fs.readFileSync('src/components/ExamBudgets.tsx', 'utf-8');

// 1. Fix print area
content = content.replace(
  '<div id="print-area" className="hidden print:block" ref={printRef}>',
  '<div id="print-area" className="fixed inset-0 z-[100] bg-white overflow-y-auto print:block print:relative print:inset-auto" ref={printRef}>'
);

// 2. Fix the syntax garbage
const brokenSyntax = `        </div>,
        document.body
      )}ld text-slate-700 transition-all cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;
const fixedSyntax = `        </div>,
        document.body
      )}
    </div>
  );
}`;

content = content.replace(brokenSyntax, fixedSyntax);

// ensure it's saved as utf8 and overwrite the file
fs.writeFileSync('src/components/ExamBudgets.tsx', content, 'utf-8');
console.log("ExamBudgets.tsx fixed!");

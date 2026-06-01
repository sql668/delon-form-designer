import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged } from 'rxjs/operators';
import { DesignerNode, FormDesignerService } from './form-designer.service';

// 定义属性配置的元数据结构
interface PropertyConfig {
  key: string; // 对应 schema 或 ui 的键
  label: string; // 显示标签
  type: 'input' | 'number' | 'switch' | 'select' | 'textarea'; // 控件类型
  target: 'schema' | 'ui'; // 更新到 schema 还是 ui
  options?: any[]; // 如果是 select，提供选项
}

@Component({
  selector: 'app-property-panel',
  template: `
    <div class="property-panel-container">
      <div *ngIf="selectedNode; else noSelection" class="p-4">
        <div class="panel-header">
          <h3>属性配置</h3>
          <span class="node-type-badge">{{ selectedNode.type }}</span>
        </div>

        <form [formGroup]="formGroup" *ngIf="formGroup" class="property-form">
          <!-- 1. 基础属性 -->
          <div class="section-title">基础属性</div>
          <!-- 【新增】Key 配置 -->
          <div class="form-item">
            <label>字段标识 (Key)</label>
            <input
              nz-input
              formControlName="key"
              placeholder="唯一标识，如: username"
              [class.is-error]="keyError"
            />
            <small *ngIf="keyError" class="error-text">{{ keyError }}</small>
          </div>
          <div class="form-item">
            <label>标题 (Title)</label>
            <input
              nz-input
              formControlName="title"
              placeholder="请输入字段标题"
            />
          </div>
          <div class="form-item">
            <label>必填 (Required)</label>
            <nz-switch formControlName="required"></nz-switch>
          </div>

          <!-- 2. 动态特定属性 -->
          <div class="section-title" *ngIf="currentConfigs.length > 0">
            组件特有属性
          </div>
          <ng-container *ngFor="let config of currentConfigs">
            <!-- 输入框/文本域 -->
            <div
              class="form-item"
              *ngIf="config.type === 'input' || config.type === 'textarea'"
            >
              <label>{{ config.label }}</label>
              <input
                *ngIf="config.type === 'input'"
                nz-input
                [formControlName]="config.key"
                [placeholder]="'请输入' + config.label"
              />
              <textarea
                *ngIf="config.type === 'textarea'"
                nz-input
                [formControlName]="config.key"
                [placeholder]="'请输入' + config.label"
                rows="3"
              ></textarea>
            </div>

            <!-- 数字输入 -->
            <div class="form-item" *ngIf="config.type === 'number'">
              <label>{{ config.label }}</label>
              <!-- 修复：使用 placeholder 而不是 nzPlaceHolder -->
              <nz-input-number
                [formControlName]="config.key"
                [nzPlaceHolder]="'请输入' + config.label"
                style="width: 100%"
              ></nz-input-number>
            </div>

            <!-- 开关 -->
            <div class="form-item" *ngIf="config.type === 'switch'">
              <label>{{ config.label }}</label>
              <nz-switch [formControlName]="config.key"></nz-switch>
            </div>

            <!-- 下拉选择 -->
            <div class="form-item" *ngIf="config.type === 'select'">
              <label>{{ config.label }}</label>
              <nz-select [formControlName]="config.key" style="width: 100%">
                <nz-option
                  *ngFor="let opt of config.options"
                  [nzValue]="opt.value"
                  [nzLabel]="opt.label"
                ></nz-option>
              </nz-select>
            </div>
          </ng-container>

          <!-- 3. 联动配置 (Visible If) -->
          <nz-divider nzText="联动与显隐" nzOrientation="left"></nz-divider>

          <div class="form-item">
            <label>显示条件 (Visible If)</label>
            <div class="linkage-editor">
              <p class="hint-text">当以下字段满足条件时，当前字段才显示：</p>

              <div formArrayName="visibleIfRules" class="rule-list">
                <div
                  *ngFor="let rule of visibleIfRules.controls; let i = index"
                  [formGroupName]="i"
                  class="rule-item"
                >
                  <nz-select
                    formControlName="fieldKey"
                    style="width: 120px; margin-right: 8px;"
                  >
                    <nz-option
                      *ngFor="let node of otherNodes"
                      [nzValue]="node.key"
                      [nzLabel]="node.title"
                    ></nz-option>
                  </nz-select>

                  <nz-select
                    formControlName="operator"
                    style="width: 80px; margin-right: 8px;"
                  >
                    <nz-option nzValue="eq" nzLabel="等于"></nz-option>
                    <nz-option nzValue="neq" nzLabel="不等于"></nz-option>
                  </nz-select>

                  <input
                    nz-input
                    formControlName="value"
                    placeholder="值"
                    style="width: 100px; margin-right: 8px;"
                  />

                  <button
                    nz-button
                    nzType="text"
                    nzDanger
                    (click)="removeRule(i)"
                  >
                    <i nz-icon nzType="close"></i>
                  </button>
                </div>
              </div>

              <button
                nz-button
                nzType="dashed"
                nzBlock
                (click)="addRule()"
                style="margin-top: 8px;"
              >
                <i nz-icon nzType="plus"></i> 添加条件
              </button>
            </div>
          </div>

          <!-- 4. 高级 Link 配置 (JSON) -->
          <div class="form-item">
            <label>高级联动 (Link JSON)</label>
            <textarea
              nz-input
              formControlName="linkJson"
              rows="4"
              placeholder='例如: [{ "field": "otherKey", "update": "..." }]'
              class="code-editor"
            ></textarea>
            <small class="text-gray-400"
              >直接编辑 UI Schema 中的 link 属性 (JSON字符串)</small
            >
          </div>
        </form>
      </div>

      <ng-template #noSelection>
        <div class="empty-state">
          <i
            nz-icon
            nzType="setting"
            nzTheme="outline"
            style="font-size: 48px; color: #d9d9d9;"
          ></i>
          <p>请在画布中选择一个组件进行编辑</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [
    `
      .property-panel-container {
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .panel-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      .node-type-badge {
        background: #e6f7ff;
        color: #1890ff;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
      }
      .property-form {
        overflow-y: auto;
        flex: 1;
        padding-right: 4px;
      }

      .section-title {
        font-size: 12px;
        color: #999;
        margin: 16px 0 8px;
        font-weight: bold;
        border-bottom: 1px solid #eee;
        padding-bottom: 4px;
      }

      .form-item {
        margin-bottom: 16px;
      }
      .form-item label {
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
        color: #333;
        font-weight: 500;
      }

      .empty-state {
        text-align: center;
        padding-top: 100px;
        color: #999;
      }

      .linkage-editor {
        background: #f9f9f9;
        padding: 10px;
        border-radius: 4px;
        border: 1px solid #eee;
      }
      .hint-text {
        font-size: 12px;
        color: #666;
        margin-bottom: 8px;
        margin-top: 0;
      }
      .rule-item {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
      }

      .code-editor {
        font-family: monospace;
        font-size: 12px;
        background: #2d2d2d;
        color: #ccc;
        border: 1px solid #444;
      }
      .code-editor::placeholder {
        color: #666;
      }
      .is-error {
        border-color: #ff4d4f;
      }
      .error-text {
        color: #ff4d4f;
        font-size: 12px;
        margin-top: 4px;
        display: block;
      }
    `,
  ],
})
export class PropertyPanelComponent implements OnInit, OnDestroy {
  formGroup!: FormGroup | null;
  private destroy$ = new Subject<void>();

  selectedNode: DesignerNode | null = null;
  currentConfigs: PropertyConfig[] = [];
  otherNodes: DesignerNode[] = []; // 用于联动选择的其它字段列表

  keyError: string | null = null; // 用于显示 Key 冲突错误

  // Getter for FormArray
  get visibleIfRules(): FormArray {
    return this.formGroup?.get('visibleIfRules') as FormArray;
  }

  // 定义不同组件类型的可配置项
  private readonly WIDGET_CONFIGS: Record<string, PropertyConfig[]> = {
    string: [
      { key: 'placeholder', label: '占位符', type: 'input', target: 'ui' },
      { key: 'description', label: '帮助说明', type: 'textarea', target: 'ui' },
    ],
    number: [
      { key: 'placeholder', label: '占位符', type: 'input', target: 'ui' },
      { key: 'minimum', label: '最小值', type: 'number', target: 'schema' },
      { key: 'maximum', label: '最大值', type: 'number', target: 'schema' },
      { key: 'step', label: '步长', type: 'number', target: 'ui' },
    ],
    textarea: [
      { key: 'placeholder', label: '占位符', type: 'input', target: 'ui' },
      { key: 'rows', label: '行数', type: 'number', target: 'ui' },
      { key: 'autosize', label: '自动高度', type: 'switch', target: 'ui' },
    ],
    select: [
      { key: 'placeholder', label: '占位符', type: 'input', target: 'ui' },
      {
        key: 'mode',
        label: '模式',
        type: 'select',
        target: 'ui',
        options: [
          { label: '单选', value: undefined },
          { label: '多选', value: 'multiple' },
        ],
      },
    ],
    date: [
      { key: 'placeholder', label: '占位符', type: 'input', target: 'ui' },
      { key: 'format', label: '显示格式', type: 'input', target: 'ui' },
    ],
    boolean: [
      {
        key: 'widget', // 允许修改 widget 类型
        label: '组件类型',
        type: 'select',
        target: 'ui',
        options: [
          { label: '开关 (Switch)', value: 'boolean' },
          { label: '复选框 (Checkbox)', value: 'checkbox' },
        ],
      },
      {
        key: 'checkedChildren',
        label: '开启文案',
        type: 'input',
        target: 'ui',
      },
      {
        key: 'unCheckedChildren',
        label: '关闭文案',
        type: 'input',
        target: 'ui',
      },
    ],
  };

  constructor(
    private fb: FormBuilder,
    private designerService: FormDesignerService,
  ) {}

  ngOnInit(): void {
    // 监听选中节点的变化
    this.designerService.selectedId$
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((id) => {
        if (id) {
          const nodes = this.designerService.currentNodes;
          this.selectedNode = nodes.find((n) => n.id === id) || null;
          // 获取除当前节点外的所有节点，用于联动选择
          this.otherNodes = nodes.filter((n) => n.id !== id);

          if (this.selectedNode) {
            this.initForm();
          }
        } else {
          this.selectedNode = null;
          this.formGroup = null;
          this.keyError = null;
        }
      });
  }

  initForm() {
    if (!this.selectedNode) return;

    const node = this.selectedNode;
    const schema =
      (this.designerService.currentSchema.properties?.[node.key] as any) || {};

    // 【关键】读取 UI 时，Key 必须带 $
    const uiKey = '$' + node.key;
    const ui = (this.designerService.currentUISchema[uiKey] as any) || {};

    const isRequired =
      this.designerService.currentSchema.required?.includes(node.key) || false;

    // 1. 确定当前组件类型的配置项
    this.currentConfigs = this.WIDGET_CONFIGS[node.type] || [];

    // 2. 解析 visibleIf 为 FormArray
    // visibleIf 结构: { otherFieldKey: [val1, val2] }
    const visibleIfRules: FormGroup[] = [];
    if (ui.visibleIf) {
      Object.keys(ui.visibleIf).forEach((key) => {
        const values = ui.visibleIf[key];
        if (Array.isArray(values) && values.length > 0) {
          visibleIfRules.push(
            this.fb.group({
              fieldKey: [key],
              operator: ['eq'], // 简化处理，默认等于
              value: [values[0]],
            }),
          );
        }
      });
    }

    // 3. 序列化 link 属性
    const linkJsonStr = ui.link ? JSON.stringify(ui.link, null, 2) : '';

    // 4. 构建动态表单组
    const group: any = {
      key: [{ value: node.key, disabled: false }, []], // 允许编辑 Key
      title: [schema.title || '', []],
      required: [isRequired, []],
      visibleIfRules: this.fb.array(visibleIfRules),
      linkJson: [linkJsonStr, []],
    };

    // 将动态配置项加入表单组
    this.currentConfigs.forEach((config) => {
      const source = config.target === 'schema' ? schema : ui;
      group[config.key] = [
        source[config.key] !== undefined ? source[config.key] : '',
        [],
      ];
    });

    this.formGroup = this.fb.group(group);

    this.keyError = null;

    // 5. 监听表单变化并更新 Service
    this.formGroup.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((val) => {
        console.log('PropertyPanel Value Changed:', val); // 【调试】查看控制台是否有输出
        if (!this.selectedNode) return;

        // 1. 处理 Key 变更 (特殊处理)
        if (val.key !== this.selectedNode.key) {
          this.handleKeyChange(val.key);
          return; // Key 变更时，暂时不处理其他字段，避免状态不一致
        }

        const schemaUpdates: any = { title: val.title };
        const uiUpdates: any = {};

        // 处理特定属性
        this.currentConfigs.forEach((config) => {
          if (val[config.key] !== undefined) {
            if (config.target === 'schema')
              schemaUpdates[config.key] = val[config.key];
            else uiUpdates[config.key] = val[config.key];
          }
        });
        debugger;
        // 处理 VisibleIf (联动显隐)
        const rules = val.visibleIfRules;
        if (rules && rules.length > 0) {
          const visibleIfObj: any = {};
          let hasValidRule = false;
          rules.forEach((r: any) => {
            if (
              r.fieldKey &&
              r.value !== null &&
              r.value !== undefined &&
              r.value !== ''
            ) {
              visibleIfObj[r.fieldKey] = [r.value];
              hasValidRule = true;
            }
          });
          if (hasValidRule) {
            uiUpdates.visibleIf = visibleIfObj;
          } else {
            uiUpdates.visibleIf = undefined; // 清除无效规则
          }
        } else {
          uiUpdates.visibleIf = undefined;
        }

        // 处理 Link JSON (高级联动)
        if (val.linkJson && val.linkJson.trim()) {
          try {
            const linkObj = JSON.parse(val.linkJson);
            uiUpdates.link = linkObj;
          } catch (e) {
            // JSON 格式错误时不更新，避免破坏现有配置
            console.warn('Invalid Link JSON');
          }
        } else {
          uiUpdates.link = undefined;
        }

        this.designerService.updateFieldConfig(this.selectedNode.id, {
          schema:
            Object.keys(schemaUpdates).length > 0 ? schemaUpdates : undefined,
          ui: Object.keys(uiUpdates).length > 0 ? uiUpdates : undefined,
          required: val.required,
        });
      });
  }

  addRule() {
    this.visibleIfRules.push(
      this.fb.group({
        fieldKey: [''],
        operator: ['eq'],
        value: [''],
      }),
    );
  }

  removeRule(index: number) {
    this.visibleIfRules.removeAt(index);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  // 【新增】处理 Key 变更逻辑
  handleKeyChange(newKey: string) {
    if (!this.selectedNode) return;

    // 简单校验：不能为空，只能包含字母数字下划线
    const keyRegex = /^[a-zA-Z0-9_]+$/;
    if (!newKey) {
      this.keyError = 'Key 不能为空';
      return;
    }
    if (!keyRegex.test(newKey)) {
      this.keyError = 'Key 只能包含字母、数字和下划线';
      return;
    }

    // 唯一性校验
    const exists = this.designerService.currentNodes.some(
      (n) => n.key === newKey && n.id !== this.selectedNode!.id,
    );
    if (exists) {
      this.keyError = `Key "${newKey}" 已存在，请使用其他名称`;
      return;
    }

    this.keyError = null;

    try {
      // 调用 Service 重命名
      this.designerService.renameKey(this.selectedNode.id, newKey);
      // 注意：重命名后，selectedId 依然有效（因为是基于 ID），但 currentNodes 里的 key 变了
      // 由于我们订阅了 selectedId$，且 initForm 会重新读取数据，所以 UI 会自动刷新
      // 但为了防止 valueChanges 循环触发，我们在这里不做额外操作
    } catch (e) {
      this.keyError = '更新 Key 失败';
    }
  }
}

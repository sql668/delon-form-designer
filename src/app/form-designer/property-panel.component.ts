import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged } from 'rxjs/operators';
import { DesignerNode, FormDesignerService } from './form-designer.service';
import { SFSchema } from '@delon/form';

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
          <!-- 通用属性：标题 -->
          <div class="form-item">
            <label>标题 (Title)</label>
            <input
              nz-input
              formControlName="title"
              placeholder="请输入字段标题"
            />
          </div>

          <!-- 通用属性：必填 -->
          <div class="form-item">
            <label>必填 (Required)</label>
            <nz-switch formControlName="required"></nz-switch>
          </div>

          <nz-divider nzText="高级配置" nzOrientation="left"></nz-divider>

          <!-- 动态生成的属性列表 -->
          <ng-container *ngFor="let config of currentConfigs">
            <!-- 输入框类型 -->
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

            <!-- 数字类型 -->
            <div class="form-item" *ngIf="config.type === 'number'">
              <label>{{ config.label }}</label>
              <nz-input-number
                [formControlName]="config.key"
                [nzPlaceHolder]="'请输入' + config.label"
                style="width: 100%"
              ></nz-input-number>
            </div>

            <!-- 开关类型 -->
            <div class="form-item" *ngIf="config.type === 'switch'">
              <label>{{ config.label }}</label>
              <nz-switch [formControlName]="config.key"></nz-switch>
            </div>

            <!-- 下拉选择类型 -->
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
    `,
  ],
})
export class PropertyPanelComponent implements OnInit, OnDestroy {
  formGroup!: FormGroup | null;
  private destroy$ = new Subject<void>();

  selectedNode: DesignerNode | null = null;
  currentConfigs: PropertyConfig[] = [];

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
      // 注意：enum 的配置通常更复杂，这里简化处理，实际可能需要一个数组编辑器
    ],
    date: [
      { key: 'placeholder', label: '占位符', type: 'input', target: 'ui' },
      { key: 'format', label: '显示格式', type: 'input', target: 'ui' }, // 如 YYYY-MM-DD
    ],
    boolean: [
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
          if (this.selectedNode) {
            this.initForm();
          }
        } else {
          this.selectedNode = null;
          this.formGroup = null;
        }
      });
  }

  initForm() {
    if (!this.selectedNode) return;

    const node = this.selectedNode;
    const schema =
      (this.designerService.currentSchema.properties?.[node.key] as any) || {};
    const ui = (this.designerService.currentUISchema[node.key] as any) || {};
    const isRequired =
      this.designerService.currentSchema.required?.includes(node.key) || false;

    // 1. 确定当前组件类型的配置项
    this.currentConfigs = this.WIDGET_CONFIGS[node.type] || [];

    // 2. 构建动态表单组
    const group: any = {
      title: [schema.title || '', []],
      required: [isRequired, []],
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

    // 3. 监听表单变化并更新 Service
    this.formGroup.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((val) => {
        if (!this.selectedNode) return;

        const schemaUpdates: any = {};
        const uiUpdates: any = {};

        // 处理通用字段
        if (val.title !== undefined) schemaUpdates.title = val.title;

        // 处理动态字段
        this.currentConfigs.forEach((config) => {
          if (val[config.key] !== undefined) {
            if (config.target === 'schema') {
              schemaUpdates[config.key] = val[config.key];
            } else {
              uiUpdates[config.key] = val[config.key];
            }
          }
        });

        this.designerService.updateFieldConfig(this.selectedNode.id, {
          schema:
            Object.keys(schemaUpdates).length > 0 ? schemaUpdates : undefined,
          ui: Object.keys(uiUpdates).length > 0 ? uiUpdates : undefined,
          required: val.required,
        });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

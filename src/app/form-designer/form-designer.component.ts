import { Component, OnInit } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { FormDesignerService, DesignerNode } from './form-designer.service';
import { SFSchema, SFUISchema } from '@delon/form';

@Component({
  selector: 'app-form-designer',
  template: `
    <div class="designer-container">
      <!-- 左侧：物料库 -->
      <div class="sidebar-left">
        <div class="sidebar-header"><h2>组件库</h2></div>
        <div
          class="sidebar-content"
          cdkDropList
          id="widget-list"
          [cdkDropListData]="widgets"
          [cdkDropListConnectedTo]="['canvas-list']"
          (cdkDropListDropped)="handleDrop($event)"
        >
          <div
            *ngFor="let item of widgets"
            class="widget-item"
            cdkDrag
            [cdkDragData]="item"
          >
            <i
              nz-icon
              [nzType]="item.icon"
              nzTheme="outline"
              class="widget-icon"
            ></i>
            <span>{{ item.label }}</span>
          </div>
        </div>
      </div>

      <!-- 中间：画布 -->
      <div class="main-canvas">
        <div class="canvas-wrapper">
          <div class="canvas-header">
            <h2>表单画布</h2>
            <span class="tip">拖拽左侧组件到此处，点击选中编辑</span>
          </div>

          <div
            class="canvas-body"
            cdkDropList
            id="canvas-list"
            [cdkDropListData]="nodes"
            [cdkDropListConnectedTo]="['widget-list']"
            (cdkDropListDropped)="handleDrop($event)"
          >
            <div *ngIf="nodes.length === 0" class="empty-state">
              请从左侧拖拽组件到此处
            </div>

            <div
              *ngFor="let node of nodes; let i = index"
              class="canvas-item"
              [class.selected]="selectedId === node.id"
              (click)="selectNode(node.id)"
              cdkDrag
              [cdkDragData]="node"
            >
              <!-- 操作栏 -->
              <div class="item-actions" *ngIf="selectedId === node.id">
                <button
                  nz-button
                  nzType="text"
                  nzSize="small"
                  (click)="copyNode(node.id); $event.stopPropagation()"
                >
                  <i nz-icon nzType="copy"></i> 复制
                </button>
                <button
                  nz-button
                  nzType="text"
                  nzDanger
                  nzSize="small"
                  (click)="removeNode(node.id); $event.stopPropagation()"
                >
                  <i nz-icon nzType="delete"></i> 删除
                </button>
              </div>

              <!-- 标题预览 -->
              <label class="preview-label" *ngIf="!isHiddenLabel(node.type)">
                {{ node.title }}
                <span class="required" *ngIf="isRequired(node.key)">*</span>
              </label>

              <!-- 真实 SF 预览 -->
              <div class="sf-wrapper">
                <sf
                  [schema]="node.previewSchema"
                  [ui]="node.previewUi"
                  [formData]="{}"
                  [button]="null"
                  layout="horizontal"
                  size="small"
                ></sf>
              </div>

              <!-- 拖拽手柄 -->
              <div class="drag-handle" cdkDragHandle title="拖拽排序">
                <i nz-icon nzType="drag" nzTheme="outline"></i>
              </div>
            </div>
          </div>
        </div>

        <div class="json-preview">
          <pre>{{ schema | json }}</pre>
        </div>
      </div>

      <!-- 右侧：属性面板 -->
      <div class="sidebar-right">
        <app-property-panel></app-property-panel>
      </div>
    </div>
  `,
  styles: [
    `
      .designer-container {
        display: flex;
        height: 100vh;
        width: 100%;
        overflow: hidden;
        background-color: #f3f4f6;
      }
      .sidebar-left {
        width: 260px;
        background: white;
        border-right: 1px solid #e5e7eb;
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
      }
      .sidebar-header {
        padding: 16px;
        border-bottom: 1px solid #e5e7eb;
      }
      .sidebar-header h2 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      .sidebar-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }
      .widget-item {
        display: flex;
        align-items: center;
        padding: 10px 12px;
        margin-bottom: 8px;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        cursor: move;
        transition: all 0.2s;
      }
      .widget-item:hover {
        border-color: #3b82f6;
        color: #3b82f6;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }
      .widget-icon {
        margin-right: 8px;
        font-size: 16px;
      }
      .main-canvas {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: #f9fafb;
      }
      .canvas-wrapper {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
      }
      .canvas-header {
        margin-bottom: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .canvas-header h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #111827;
      }
      .tip {
        font-size: 12px;
        color: #6b7280;
      }
      .canvas-body {
        min-height: 400px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        padding: 20px;
        position: relative;
      }
      .empty-state {
        text-align: center;
        color: #9ca3af;
        padding: 60px 20px;
        border: 2px dashed #e5e7eb;
        border-radius: 8px;
        pointer-events: none;
      }

      .canvas-item {
        position: relative;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        margin-bottom: 12px;
        padding: 16px;
        transition: all 0.2s;
        cursor: pointer;
      }
      .canvas-item:hover {
        border-color: #bfdbfe;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      .canvas-item.selected {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }

      .item-actions {
        position: absolute;
        top: -12px;
        right: 10px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        padding: 2px 4px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        z-index: 10;
        display: flex;
        gap: 4px;
      }

      /* SF 预览区域样式优化 */
      .sf-wrapper {
        position: relative;
        z-index: 1;
        margin-top: 8px;
      }
      /* 禁用 SF 内部控件的交互，防止点击输入框时触发焦点而不是选中卡片 */
      .sf-wrapper ::ng-deep .ant-input,
      .sf-wrapper ::ng-deep .ant-select-selector,
      .sf-wrapper ::ng-deep .ant-picker,
      .sf-wrapper ::ng-deep .ant-switch,
      .sf-wrapper ::ng-deep textarea {
        pointer-events: none;
        background-color: #f9fafb;
      }
      .sf-wrapper ::ng-deep .ant-form-item {
        margin-bottom: 0 !important;
      }
      .sf-wrapper ::ng-deep .ant-form-item-label {
        display: none;
      }

      .preview-label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        font-size: 14px;
        color: #374151;
      }
      .required {
        color: #ef4444;
        margin-left: 4px;
      }

      /* 拖拽手柄样式 */
      .drag-handle {
        position: absolute;
        left: -28px;
        top: 50%;
        transform: translateY(-50%);
        color: #9ca3af;
        cursor: move;
        opacity: 0;
        transition: opacity 0.2s;
        padding: 8px;
        z-index: 20;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 4px;
      }
      .canvas-item:hover .drag-handle {
        opacity: 1;
      }

      .sidebar-right {
        width: 300px;
        background: white;
        border-left: 1px solid #e5e7eb;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
      }
      .json-preview {
        height: 150px;
        background: #1f2937;
        color: #10b981;
        padding: 10px;
        overflow: auto;
        font-family: monospace;
        font-size: 12px;
        border-top: 1px solid #e5e7eb;
      }
      .json-preview pre {
        margin: 0;
      }

      /* CDK 拖拽辅助样式 */
      .cdk-drag-placeholder {
        opacity: 0.4;
        border: 2px dashed #3b82f6;
        background: #eff6ff;
      }
      .cdk-drag-preview {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        border-radius: 6px;
        background: white;
      }
      .cdk-drag-animating {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
    `,
  ],
})
export class FormDesignerComponent implements OnInit {
  schema: SFSchema = { properties: {} };
  ui: SFUISchema = {};
  nodes: DesignerNode[] = [];
  selectedId: string | null = null;

  widgets = [
    { type: 'string', label: '文本输入', icon: 'font-size' },
    { type: 'number', label: '数字输入', icon: 'number' },
    { type: 'boolean', label: '开关', icon: 'check-square' },
    { type: 'date', label: '日期选择', icon: 'calendar' },
    { type: 'select', label: '下拉选择', icon: 'down' },
    { type: 'textarea', label: '多行文本', icon: 'enter' },
  ];

  constructor(private designerService: FormDesignerService) {}

  ngOnInit(): void {
    this.designerService.schema$.subscribe((s) => (this.schema = s));
    this.designerService.uiSchema$.subscribe((u) => (this.ui = u));
    this.designerService.nodes$.subscribe((n) => (this.nodes = n));
    this.designerService.selectedId$.subscribe((id) => (this.selectedId = id));
  }

  handleDrop(event: CdkDragDrop<any[]>) {
    if (event.previousContainer.id === 'widget-list') {
      const itemType = event.item.data.type;
      this.designerService.addField(itemType);
    } else if (event.previousContainer.id === 'canvas-list') {
      this.designerService.moveNode(event as CdkDragDrop<DesignerNode[]>);
    }
  }

  selectNode(id: string) {
    this.designerService.selectNode(id);
  }

  copyNode(id: string) {
    this.designerService.copyNode(id);
  }

  removeNode(id: string) {
    this.designerService.removeNode(id);
  }

  isRequired(key: string): boolean {
    return !!this.schema.required?.includes(key);
  }

  // 生成单字段 Schema
  getNodeSchemaObj(node: DesignerNode): SFSchema {
    return {
      properties: {
        [node.key]: this.schema.properties?.[node.key] || {},
      },
    };
  }

  // 生成单字段 UI
  getNodeUiObj(node: DesignerNode): SFUISchema {
    return {
      [node.key]: this.ui[node.key] || {},
    };
  }

  isHiddenLabel(type: string): boolean {
    return type === 'boolean';
  }
}

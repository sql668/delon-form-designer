import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule,FormsModule } from '@angular/forms';
import { DelonFormModule } from '@delon/form';

// NG-ZORRO Imports
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCascaderModule } from 'ng-zorro-antd/cascader';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMentionModule } from 'ng-zorro-antd/mention';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTimePickerModule } from 'ng-zorro-antd/time-picker';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzTransferModule } from 'ng-zorro-antd/transfer';
import { NzTreeSelectModule } from 'ng-zorro-antd/tree-select';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzDividerModule } from 'ng-zorro-antd/divider';

// NG-ZORRO Imports
import { FormDesignerComponent } from './form-designer.component';
import { PropertyPanelComponent } from './property-panel.component';

import { DragDropModule } from '@angular/cdk/drag-drop';



@NgModule({
  declarations: [FormDesignerComponent, PropertyPanelComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule, FormsModule,
    DelonFormModule,
    NzAutocompleteModule,
    NzCardModule,
    NzCheckboxModule,
    NzCascaderModule,
    NzCheckboxModule,
    NzDatePickerModule,
    NzInputModule,
    NzDividerModule,
    NzButtonModule, NzGridModule, NzInputNumberModule, NzMentionModule, NzModalModule, NzRadioModule, NzRateModule, NzSelectModule, NzTagModule, NzTimePickerModule, NzToolTipModule, NzTransferModule, NzTreeSelectModule, NzUploadModule, NzMessageModule, NzIconModule, NzSliderModule,
    NzSwitchModule,
    NzSliderModule,
    NzButtonModule,
    NzFormModule,
    NzIconModule,
    DragDropModule,
  ],
  exports: [FormDesignerComponent],
})
export class FormDesignerModule {}
